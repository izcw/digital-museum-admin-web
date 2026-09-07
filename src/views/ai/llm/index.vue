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
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { formatDateTime } from '@/utils/date'
  import LlmDialog from './modules/llm-dialog.vue'
  import LlmSearch from './modules/llm-search.vue'
  import type { LlmModel, LlmModelMutation, LlmSearchParams } from './types'

  defineOptions({ name: 'AiLlm' })

  const initialModels: LlmModel[] = [
    {
      id: 1,
      name: 'OpenAI GPT-4.1',
      model: 'gpt-4.1',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-demo-openai',
      maxTokens: 32768,
      temperature: 0.7,
      topP: 1,
      timeout: 60,
      stream: true,
      isDefault: true,
      status: 'enabled',
      remark: '默认文本对话模型',
      createdAt: '2026-08-21 10:00:00',
      updatedAt: '2026-09-01 16:20:00'
    },
    {
      id: 2,
      name: 'DeepSeek Chat',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-demo-deepseek',
      maxTokens: 8192,
      temperature: 0.7,
      topP: 1,
      timeout: 60,
      stream: true,
      isDefault: false,
      status: 'enabled',
      remark: 'OpenAI Compatible 对话模型',
      createdAt: '2026-08-22 14:30:00',
      updatedAt: '2026-08-29 09:45:00'
    },
    {
      id: 3,
      name: '本地 Qwen',
      model: 'qwen2.5:14b',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
      maxTokens: 8192,
      temperature: 0.6,
      topP: 0.9,
      timeout: 120,
      stream: true,
      isDefault: false,
      status: 'disabled',
      remark: '通过 OpenAI Compatible 接口调用本地模型',
      createdAt: '2026-08-25 11:15:00',
      updatedAt: '2026-08-28 18:10:00'
    }
  ]

  const modelList = ref<LlmModel[]>(initialModels)
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

  const maskApiKey = (value: string) => {
    if (!value) return '-'
    if (value.length <= 8) return '*'.repeat(value.length)
    return value.slice(0, 4) + '****' + value.slice(-4)
  }

  const { columns, columnChecks } = useTableColumns<LlmModel>(() => [
    { type: 'globalIndex', label: '序号', width: 70, fixed: 'left' },
    { prop: 'name', label: '配置名称', minWidth: 170, fixed: 'left', showOverflowTooltip: true },
    { prop: 'model', label: 'Model', minWidth: 170, showOverflowTooltip: true },
    { prop: 'baseUrl', label: 'Base URL', minWidth: 260, showOverflowTooltip: true },
    {
      prop: 'apiKey',
      label: 'API Key',
      minWidth: 160,
      formatter: (row) => maskApiKey(row.apiKey)
    },
    {
      prop: 'maxTokens',
      label: 'Max Tokens',
      width: 130,
      formatter: (row) => row.maxTokens.toLocaleString()
    },
    { prop: 'temperature', label: 'Temperature', width: 120 },
    { prop: 'topP', label: 'Top P', width: 90 },
    {
      prop: 'timeout',
      label: '超时时间',
      width: 100,
      formatter: (row) => row.timeout + ' 秒'
    },
    {
      prop: 'stream',
      label: '流式响应',
      width: 100,
      formatter: (row) => (row.stream ? '开启' : '关闭')
    },
    {
      prop: 'isDefault',
      label: '默认模型',
      width: 110,
      formatter: (row) =>
        row.isDefault
          ? h(ElTag, { type: 'primary' }, () => '默认')
          : h('span', { class: 'text-g-400' }, '-')
    },
    {
      prop: 'status',
      label: '状态',
      width: 90,
      formatter: (row) =>
        h(ElTag, { type: row.status === 'enabled' ? 'success' : 'info' }, () =>
          row.status === 'enabled' ? '启用' : '停用'
        )
    },
    {
      prop: 'remark',
      label: '备注',
      minWidth: 180,
      showOverflowTooltip: true,
      formatter: (row) => row.remark || '-'
    },
    {
      prop: 'createdAt',
      label: '创建时间',
      width: 180,
      sortable: true,
      formatter: (row) => formatDateTime(row.createdAt)
    },
    {
      prop: 'updatedAt',
      label: '更新时间',
      width: 180,
      sortable: true,
      formatter: (row) => formatDateTime(row.updatedAt)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 120,
      fixed: 'right',
      disabled: true,
      formatter: (row) =>
        h('div', { class: 'flex items-center' }, [
          h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
          h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
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

    saving.value = true
    try {
      const now = new Date().toISOString()
      if (payload.isDefault) {
        modelList.value.forEach((item) => (item.isDefault = false))
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
