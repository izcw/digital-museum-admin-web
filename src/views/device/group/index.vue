<template>
  <div class="art-full-height">
    <ElCard shadow="never" class="mb-3">
      <ElForm inline @submit.prevent="search = keyword.trim()">
        <ElFormItem label="设备标签"
          ><ElInput v-model="keyword" clearable placeholder="搜索标签名称或编码"
        /></ElFormItem>
        <ElFormItem
          ><ElButton type="primary" @click="search = keyword.trim()">查询</ElButton
          ><ElButton @click="resetSearch">重置</ElButton></ElFormItem
        >
      </ElForm>
    </ElCard>
    <ElCard class="art-table-card">
      <ArtTableHeader layout="refresh,size,fullscreen" @refresh="load">
        <template #left><ElButton type="primary" @click="edit()">新增标签</ElButton></template>
      </ArtTableHeader>
      <ElTable
        v-loading="loading"
        :data="rows"
        row-key="id"
        :empty-text="failed ? '加载失败，请点击刷新重试' : '暂无设备标签'"
      >
        <ElTableColumn prop="name" label="标签名称" min-width="160" />
        <ElTableColumn prop="code" label="标签编码" min-width="160" />
        <ElTableColumn prop="deviceCount" label="设备数量" width="110" />
        <ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === 'enabled' ? '启用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <ElTableColumn label="更新时间" width="180"
          ><template #default="{ row }">{{
            formatDateTime(row.updatedAt)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="140" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="edit(row)">编辑</ElButton
            ><ElButton link type="danger" :disabled="row.deviceCount > 0" @click="remove(row)"
              >删除</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>
    <ElDialog
      v-model="visible"
      :title="editingId ? '编辑设备标签' : '新增设备标签'"
      width="520px"
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="标签名称" prop="name"
          ><ElInput v-model="form.name" maxlength="50" placeholder="如：试点设备、低年级"
        /></ElFormItem>
        <ElFormItem label="标签编码" prop="code"
          ><ElInput v-model="form.code" maxlength="50" placeholder="如：PILOT"
        /></ElFormItem>
        <ElFormItem label="状态"
          ><ElSwitch v-model="form.status" active-value="enabled" inactive-value="disabled"
        /></ElFormItem>
        <ElFormItem label="备注"
          ><ElInput v-model="form.remark" type="textarea" maxlength="300" show-word-limit
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton :disabled="saving" @click="visible = false">取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="save">保存</ElButton></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { apiServerRequest } from '@/api/auth'
  import { schoolError } from '@/views/school/shared/school-data'
  import { formatDateTime } from '@/utils/date'
  import type { DeviceTag } from '../shared/device-store'
  defineOptions({ name: 'DeviceGroup' })
  const tags = ref<DeviceTag[]>([])
  const keyword = ref(''),
    search = ref('')
  const resetSearch = () => {
    keyword.value = ''
    search.value = ''
  }
  const loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    visible = ref(false)
  const editingId = ref<number>()
  const formRef = ref<FormInstance>()
  const form = reactive({ name: '', code: '', status: 'enabled', remark: '' })
  const rows = computed(() =>
    tags.value.filter((t) =>
      `${t.name} ${t.code}`.toLowerCase().includes(search.value.toLowerCase())
    )
  )
  const rules: FormRules = {
    name: [{ required: true, whitespace: true, message: '请输入标签名称', trigger: 'blur' }],
    code: [
      {
        required: true,
        pattern: /^[A-Za-z0-9_-]+$/,
        message: '编码仅支持字母、数字、下划线和短横线',
        trigger: 'blur'
      }
    ]
  }
  const load = async () => {
    loading.value = true
    failed.value = false
    try {
      tags.value = (
        await apiServerRequest.get<DeviceTag[]>('/device-tags', { timeout: 15000 })
      ).data
    } catch (error) {
      failed.value = true
      tags.value = []
      ElMessage.error(schoolError(error))
    } finally {
      loading.value = false
    }
  }
  onMounted(load)
  let activated = false
  onActivated(() => {
    if (activated) void load()
    activated = true
  })
  const edit = (row?: DeviceTag) => {
    editingId.value = row?.id
    Object.assign(form, {
      name: row?.name ?? '',
      code: row?.code ?? '',
      status: row?.status ?? 'enabled',
      remark: row?.remark ?? ''
    })
    visible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
  const save = async () => {
    if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const data = { ...form, name: form.name.trim(), code: form.code.trim() }
      if (editingId.value)
        await apiServerRequest.patch(`/device-tags/${editingId.value}`, data, { timeout: 15000 })
      else await apiServerRequest.post('/device-tags', data, { timeout: 15000 })
      visible.value = false
      ElMessage.success('标签已保存')
      await load()
    } catch (error) {
      ElMessage.error(schoolError(error))
    } finally {
      saving.value = false
    }
  }
  const remove = async (row: DeviceTag) => {
    try {
      await ElMessageBox.confirm(`确定删除标签“${row.name}”吗？`, '删除标签', { type: 'warning' })
      await apiServerRequest.delete(`/device-tags/${row.id}`, { timeout: 15000 })
      ElMessage.success('标签已删除')
      await load()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error(schoolError(error))
    }
  }
</script>
