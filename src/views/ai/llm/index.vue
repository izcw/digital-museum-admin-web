<!-- 大模型管理页面 -->
<template>
  <div class="llm-page art-full-height">
    <LlmSearch v-model="searchForm" @search="handleSearch" @reset="handleReset" />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-ripple @click="showDialog('add')">新增模型</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="pagedModels"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <LlmDialog
      v-model:visible="dialogVisible"
      :type="dialogType"
      :model-data="currentModel"
      :loading="saving"
      @submit="handleDialogSubmit"
    />
  </div>
</template>

<script setup lang="ts">
  import '../shared/scene-store'
  import { ElMessage, ElMessageBox, ElTag, ElButton } from 'element-plus'
  import { aiState, references } from '../shared/ai-store'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { formatDateTime } from '@/utils/date'
  import LlmDialog from './components/llm-dialog.vue'
  import LlmSearch from './components/llm-search.vue'
  import type { LlmModel, LlmModelMutation, LlmSearchParams } from './types'

  defineOptions({ name: 'AiLlm' })

  const modelList = computed<LlmModel[]>({
    get: () => aiState.models,
    set: (value) => {
      aiState.models = value as typeof aiState.models
    }
  })
  const searchForm = ref<LlmSearchParams>({})
  const appliedSearch = ref<LlmSearchParams>({})
  const loading = ref(false)
  const saving = ref(false)
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const currentModel = ref<Partial<LlmModel>>({})
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const filteredModels = computed(() => {
    const { keyword, baseUrl, status } = appliedSearch.value
    const normalizedKeyword = keyword?.trim().toLowerCase()
    const normalizedBaseUrl = baseUrl?.trim().toLowerCase()
    return modelList.value.filter(
      (item) =>
        (!normalizedKeyword ||
          (item.name + ' ' + item.model).toLowerCase().includes(normalizedKeyword)) &&
        (!normalizedBaseUrl || item.baseUrl.toLowerCase().includes(normalizedBaseUrl)) &&
        (!status || item.status === status)
    )
  })

  const pagedModels = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredModels.value.slice(start, start + pagination.size)
  })

  watch(
    filteredModels,
    (rows) => {
      pagination.total = rows.length
      const maxPage = Math.max(1, Math.ceil(rows.length / pagination.size))
      if (pagination.current > maxPage) pagination.current = maxPage
    },
    { immediate: true }
  )

  const { columns, columnChecks } = useTableColumns<LlmModel>(() => [
    { prop: 'name', label: '配置名称', minWidth: 180, fixed: 'left' },
    { prop: 'model', label: '模型标识', minWidth: 190 },
    {
      prop: 'purpose',
      label: '用途',
      width: 100,
      formatter: (r) => (r.purpose === 'embedding' ? '向量化' : '对话')
    },
    { prop: 'provider', label: '连接方式', minWidth: 170 },
    {
      prop: 'apiKeyConfigured',
      label: '凭据',
      width: 100,
      formatter: (r) => (r.apiKey || r.apiKeyConfigured ? '已配置' : '未配置')
    },
    { prop: 'isDefault', label: '默认', width: 90, formatter: (r) => (r.isDefault ? '默认' : '—') },
    {
      prop: 'connection',
      label: '连接状态',
      width: 130,
      formatter: () => h(ElTag, { type: 'info' }, () => '未测试')
    },
    {
      prop: 'status',
      label: '可用状态',
      width: 100,
      formatter: (r) => (r.status === 'enabled' ? '启用' : '停用')
    },
    {
      prop: 'references',
      label: '引用',
      width: 90,
      formatter: (r) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () =>
              ElMessageBox.alert(references('model', r.id).join('、') || '暂无引用', '引用对象')
          },
          () => String(references('model', r.id).length)
        )
    },
    {
      prop: 'updatedAt',
      label: '更新时间',
      width: 170,
      formatter: (r) => formatDateTime(r.updatedAt)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 230,
      fixed: 'right',
      formatter: (r) =>
        h('div', [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => showDialog('edit', r) },
            () => '编辑'
          ),
          h(
            ElButton,
            {
              link: true,
              onClick: () =>
                ElMessageBox.alert(
                  '当前仅预览管理页面，不发送网络请求。请核对地址、模型标识和凭据；连接状态保持“未测试”。',
                  '连接测试'
                )
            },
            () => '连接测试'
          ),
          h(ElButton, { link: true, type: 'danger', onClick: () => handleDelete(r) }, () => '删除')
        ])
    }
  ])

  const handleSearch = (params: LlmSearchParams) => {
    appliedSearch.value = { ...params }
    pagination.current = 1
  }

  const handleReset = () => {
    searchForm.value = {}
    appliedSearch.value = {}
    pagination.current = 1
  }

  const refreshData = async () => {
    loading.value = true
    await nextTick()
    loading.value = false
    ElMessage.success('数据已刷新')
  }

  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }

  const handleCurrentChange = (current: number) => {
    pagination.current = current
  }

  const showDialog = (type: 'add' | 'edit', row?: LlmModel) => {
    dialogType.value = type
    currentModel.value = row ? { ...row } : {}
    dialogVisible.value = true
  }

  const handleDialogSubmit = async (payload: LlmModelMutation) => {
    const editingId = currentModel.value.id
    const duplicated = modelList.value.some(
      (item) =>
        item.model.toLowerCase() === payload.model.toLowerCase() &&
        item.baseUrl.toLowerCase() === payload.baseUrl.toLowerCase() &&
        item.id !== editingId
    )
    if (duplicated) return void ElMessage.warning('该 Base URL 下已存在相同 Model')

    const refs = editingId ? references('model', editingId) : []
    if (
      refs.length &&
      (payload.status === 'disabled' || payload.purpose !== currentModel.value.purpose)
    )
      return void ElMessage.warning('仍被引用，请先调整：' + refs.join('、'))
    if (payload.isDefault && payload.status !== 'enabled')
      return void ElMessage.warning('默认模型必须启用')
    saving.value = true
    try {
      const now = new Date().toISOString()
      if (payload.isDefault) {
        modelList.value
          .filter((item) => item.purpose === payload.purpose)
          .forEach((item) => (item.isDefault = false))
      }
      if (dialogType.value === 'add') {
        const nextId = Math.max(0, ...modelList.value.map((item) => item.id)) + 1
        modelList.value.unshift({ ...payload, id: nextId, createdAt: now, updatedAt: now })
        ElMessage.success('模型新增成功')
      } else {
        const index = modelList.value.findIndex((item) => item.id === editingId)
        if (index >= 0) {
          modelList.value[index] = {
            ...modelList.value[index],
            ...payload,
            updatedAt: now
          }
        }
        ElMessage.success('模型更新成功')
      }
      dialogVisible.value = false
      currentModel.value = {}
    } finally {
      saving.value = false
    }
  }

  const handleDelete = async (row: LlmModel) => {
    if (references('model', row.id).length)
      return void ElMessage.warning('仍被引用：' + references('model', row.id).join('、'))
    if (row.isDefault) return void ElMessage.warning('默认模型不能删除，请先更换默认模型')
    try {
      await ElMessageBox.confirm('确定删除模型“' + row.name + '”吗？', '删除模型', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      modelList.value = modelList.value.filter((item) => item.id !== row.id)
      ElMessage.success('模型删除成功')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') throw error
    }
  }
</script>
