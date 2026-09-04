<template>
  <div class="device-group-page art-full-height">
    <ElCard class="search-card" shadow="never">
      <ElForm :model="searchForm" inline @submit.prevent="handleSearch">
        <ElFormItem label="分组名称">
          <ElInput v-model="searchForm.keyword" clearable placeholder="请输入分组名称或编码" />
        </ElFormItem>
        <ElFormItem label="所在位置">
          <ElInput v-model="searchForm.location" clearable placeholder="请输入所在位置" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="searchForm.status"
            clearable
            placeholder="全部状态"
            style="width: 140px"
          >
            <ElOption label="启用" value="enabled" />
            <ElOption label="停用" value="disabled" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard class="art-table-card">
      <ArtTableHeader
        :show-zebra="false"
        layout="refresh,size,fullscreen,settings"
        @refresh="refreshData"
      >
        <template #left><ElButton v-ripple @click="openDialog('add')">新增分组</ElButton></template>
      </ArtTableHeader>
      <ArtTable
        row-key="id"
        :data="treeData"
        :columns="columns"
        :stripe="false"
        :default-expand-all="true"
        :tree-props="{ children: 'children' }"
        empty-height="360px"
      />
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增设备分组' : '编辑设备分组'"
      width="560px"
      align-center
      :close-on-click-modal="false"
      @closed="formRef?.resetFields()"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="分组名称" prop="groupName"
          ><ElInput v-model="form.groupName" maxlength="50" placeholder="请输入分组名称"
        /></ElFormItem>
        <ElFormItem label="分组编码" prop="groupCode"
          ><ElInput v-model="form.groupCode" maxlength="50" placeholder="如 HALL-A"
        /></ElFormItem>
        <ElFormItem label="上级分组">
          <ElTreeSelect
            v-model="form.parentId"
            :data="parentOptions"
            clearable
            check-strictly
            class="w-full"
            placeholder="不选择则创建顶级分组"
          />
        </ElFormItem>
        <ElFormItem label="所在位置"
          ><ElInput v-model="form.location" maxlength="100" placeholder="请输入场馆、楼层或区域"
        /></ElFormItem>
        <ElFormItem label="排序"
          ><ElInputNumber v-model="form.sort" :min="0" :max="9999" class="!w-full"
        /></ElFormItem>
        <ElFormItem label="启用状态"><ElSwitch v-model="enabled" /></ElFormItem>
        <ElFormItem label="备注"
          ><ElInput v-model="form.remark" type="textarea" :rows="3" maxlength="300" show-word-limit
        /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import type { ColumnOption } from '@/types/component'
  import { formatDateTime } from '@/utils/date'
  import {
    deviceGroups,
    getGroupDeviceCount,
    getGroupName,
    removeDeviceGroup,
    saveDeviceGroup,
    type DeviceGroup,
    type DeviceGroupMutation
  } from '../shared/device-store'

  defineOptions({ name: 'DeviceGroup' })
  type GroupTreeNode = DeviceGroup & { children?: GroupTreeNode[] }

  const searchForm = reactive({ keyword: '', location: '', status: '' })
  const appliedSearch = reactive({ keyword: '', location: '', status: '' })
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const editingId = ref<number>()
  const formRef = ref<FormInstance>()
  const createEmptyForm = (): DeviceGroupMutation => ({
    groupCode: '',
    groupName: '',
    parentId: undefined,
    location: '',
    sort: 0,
    status: 'enabled',
    remark: ''
  })
  const form = reactive<DeviceGroupMutation>(createEmptyForm())
  const enabled = computed({
    get: () => form.status === 'enabled',
    set: (value: boolean) => (form.status = value ? 'enabled' : 'disabled')
  })
  const rules: FormRules = {
    groupName: [{ required: true, message: '请输入分组名称', trigger: 'blur' }],
    groupCode: [
      { required: true, message: '请输入分组编码', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线和短横线', trigger: 'blur' }
    ]
  }
  const buildTree = (rows: DeviceGroup[]): GroupTreeNode[] => {
    const map = new Map<number, GroupTreeNode>()
    rows.forEach((item) => map.set(item.id, { ...item, children: [] }))
    const roots: GroupTreeNode[] = []
    map.forEach((item) => {
      const parent = item.parentId ? map.get(item.parentId) : undefined
      if (parent) parent.children!.push(item)
      else roots.push(item)
    })
    const sortTree = (nodes: GroupTreeNode[]) =>
      nodes.sort((a, b) => a.sort - b.sort).forEach((node) => sortTree(node.children ?? []))
    sortTree(roots)
    return roots
  }
  const filteredRows = computed(() => {
    const keyword = appliedSearch.keyword.trim().toLowerCase()
    const location = appliedSearch.location.trim().toLowerCase()
    return deviceGroups.value.filter(
      (item) =>
        (!keyword || `${item.groupName} ${item.groupCode}`.toLowerCase().includes(keyword)) &&
        (!location || item.location.toLowerCase().includes(location)) &&
        (!appliedSearch.status || item.status === appliedSearch.status)
    )
  })
  const treeData = computed(() => buildTree(filteredRows.value))
  const parentOptions = computed(() => {
    const rows = deviceGroups.value.filter(
      (item) =>
        item.id !== editingId.value && !item.path.split('/').includes(String(editingId.value))
    )
    const convert = (
      nodes: GroupTreeNode[]
    ): Array<{ value: number; label: string; disabled: boolean; children?: unknown[] }> =>
      nodes.map((node) => ({
        value: node.id,
        label: node.groupName,
        disabled: node.status === 'disabled',
        children: node.children?.length ? convert(node.children) : undefined
      }))
    return convert(buildTree(rows))
  })
  const columns: ColumnOption<DeviceGroup>[] = [
    { prop: 'groupName', label: '分组名称', minWidth: 200 },
    { prop: 'groupCode', label: '分组编码', minWidth: 150 },
    {
      prop: 'parentId',
      label: '上级分组',
      minWidth: 130,
      formatter: (row) => (row.parentId ? getGroupName(row.parentId) : '顶级分组')
    },
    { prop: 'location', label: '所在位置', minWidth: 160, showOverflowTooltip: true },
    {
      prop: 'deviceCount',
      label: '直属设备',
      width: 100,
      formatter: (row) => getGroupDeviceCount(row.id)
    },
    { prop: 'sort', label: '排序', width: 80 },
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
      prop: 'updatedAt',
      label: '更新时间',
      width: 180,
      formatter: (row) => formatDateTime(row.updatedAt)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 120,
      fixed: 'right',
      formatter: (row) =>
        h('div', { class: 'flex items-center' }, [
          h(ArtButtonTable, { type: 'edit', onClick: () => openDialog('edit', row) }),
          h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
        ])
    }
  ]
  const handleSearch = () => Object.assign(appliedSearch, searchForm)
  const handleReset = () => {
    Object.assign(searchForm, { keyword: '', location: '', status: '' })
    handleSearch()
  }
  const refreshData = () => {
    handleSearch()
    ElMessage.success('数据已刷新')
  }
  const openDialog = (type: 'add' | 'edit', row?: DeviceGroup) => {
    dialogType.value = type
    editingId.value = row?.id
    Object.assign(
      form,
      row
        ? {
            groupCode: row.groupCode,
            groupName: row.groupName,
            parentId: row.parentId,
            location: row.location,
            sort: row.sort,
            status: row.status,
            remark: row.remark
          }
        : createEmptyForm()
    )
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    const duplicated = deviceGroups.value.some(
      (item) =>
        item.groupCode.toLowerCase() === form.groupCode.trim().toLowerCase() &&
        item.id !== editingId.value
    )
    if (duplicated) return void ElMessage.warning('分组编码已存在')
    saveDeviceGroup(
      { ...form, groupCode: form.groupCode.trim(), groupName: form.groupName.trim() },
      editingId.value
    )
    dialogVisible.value = false
    ElMessage.success(dialogType.value === 'add' ? '分组新增成功' : '分组修改成功')
  }
  const handleDelete = async (row: DeviceGroup) => {
    if (deviceGroups.value.some((item) => item.parentId === row.id))
      return void ElMessage.warning('该分组存在下级分组，无法删除')
    if (getGroupDeviceCount(row.id)) return void ElMessage.warning('该分组已关联设备，无法删除')
    try {
      await ElMessageBox.confirm(`确定删除分组“${row.groupName}”吗？`, '删除分组', {
        type: 'warning'
      })
      removeDeviceGroup(row.id)
      ElMessage.success('分组删除成功')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') throw error
    }
  }
</script>

<style scoped lang="scss">
  .search-card {
    margin-bottom: 12px;
  }

  .search-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .search-card :deep(.el-form-item) {
    margin-bottom: 16px;
  }
</style>
