<!-- 角色管理页面 -->
<template>
  <div class="art-full-height">
    <RoleSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="resetSearchParams"
    />

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElButton v-ripple @click="showDialog('add')">新增角色</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <RoleEditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :role-data="currentRoleData"
      @success="refreshData"
    />

    <RolePermissionDialog
      v-model="permissionDialog"
      :role-data="currentRoleData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { fetchDeleteRole, fetchGetRoleList } from '@/api/system-manage'
  import { useTable } from '@/hooks/core/useTable'
  import { formatDateTime } from '@/utils/date'
  import RoleEditDialog from './modules/role-edit-dialog.vue'
  import RolePermissionDialog from './modules/role-permission-dialog.vue'
  import RoleSearch from './modules/role-search.vue'

  defineOptions({ name: 'Role' })

  type RoleListItem = Api.SystemManage.RoleListItem
  type RoleSearchFormParams = Api.SystemManage.RoleSearchParams & { daterange?: string[] }

  const searchForm = ref<RoleSearchFormParams>({
    roleName: undefined,
    roleCode: undefined,
    description: undefined,
    enabled: undefined,
    daterange: undefined
  })
  const showSearchBar = ref(false)
  const dialogVisible = ref(false)
  const permissionDialog = ref(false)
  const currentRoleData = ref<RoleListItem | undefined>()
  const dialogType = ref<'add' | 'edit'>('add')

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetRoleList,
      apiParams: { current: 1, size: 20 },
      excludeParams: ['daterange'],
      columnsFactory: () => [
        { prop: 'index', label: '序号', width: 100 },
        { prop: 'roleName', label: '角色名称', minWidth: 120 },
        { prop: 'roleCode', label: '角色编码', minWidth: 120 },
        {
          prop: 'description',
          label: '角色描述',
          minWidth: 150,
          showOverflowTooltip: true
        },
        {
          prop: 'enabled',
          label: '角色状态',
          width: 100,
          formatter: (row) =>
            h(ElTag, { type: row.enabled ? 'success' : 'warning' }, () =>
              row.enabled ? '启用' : '禁用'
            )
        },
        {
          prop: 'createTime',
          label: '创建日期',
          width: 180,
          sortable: true,
          formatter: (row: RoleListItem) => formatDateTime(row.createTime)
        },
        {
          prop: 'updateTime',
          label: '更新日期',
          width: 180,
          sortable: true,
          formatter: (row: RoleListItem) => formatDateTime(row.updateTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 80,
          fixed: 'right',
          formatter: (row: RoleListItem) =>
            h(ArtButtonMore, {
              list: [
                { key: 'permission', label: '菜单权限', icon: 'ri:user-3-line' },
                { key: 'edit', label: '编辑角色', icon: 'ri:edit-2-line' },
                {
                  key: 'delete',
                  label: '删除角色',
                  icon: 'ri:delete-bin-4-line',
                  color: '#f56c6c'
                }
              ],
              onClick: (item: ButtonMoreItem) => buttonMoreClick(item, row)
            })
        }
      ]
    }
  })

  const showDialog = (type: 'add' | 'edit', row?: RoleListItem) => {
    dialogType.value = type
    currentRoleData.value = row
    dialogVisible.value = true
  }
  const handleSearch = (params: RoleSearchFormParams) => {
    const { daterange, ...filters } = params
    const [startTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
    replaceSearchParams({ ...filters, startTime, endTime })
    getData()
  }
  const buttonMoreClick = (item: ButtonMoreItem, row: RoleListItem) => {
    if (item.key === 'permission') {
      currentRoleData.value = row
      permissionDialog.value = true
    } else if (item.key === 'edit') {
      showDialog('edit', row)
    } else if (item.key === 'delete') {
      deleteRole(row)
    }
  }
  const deleteRole = async (row: RoleListItem) => {
    try {
      await ElMessageBox.confirm(`确定删除角色“${row.roleName}”吗？`, '删除角色', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchDeleteRole(row.roleId)
      await refreshRemove()
      ElMessage.success('角色删除成功')
    } catch (error) {
      if (error === 'cancel' || error === 'close') return
      ElMessage.error(getErrorMessage(error, '角色删除失败'))
    }
  }
  const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message
    return Array.isArray(message) ? message.join('；') : message || fallback
  }
</script>
