<!-- 用户管理页面 -->
<template>
  <div class="user-page art-full-height">
    <UserSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-ripple @click="showDialog('add')">新增用户</ElButton>
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

    <UserDialog
      v-model:visible="dialogVisible"
      :type="dialogType"
      :user-data="currentUserData"
      :loading="saving"
      @submit="handleDialogSubmit"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchCreateUser,
    fetchDeleteUser,
    fetchGetUserList,
    fetchUpdateUser
  } from '@/api/system-manage'
  import { formatDateTime } from '@/utils/date'
  import UserDialog from './components/user-dialog.vue'
  import UserSearch from './components/user-search.vue'

  defineOptions({ name: 'User' })

  type UserListItem = Api.SystemManage.UserListItem
  type DialogType = 'add' | 'edit'

  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const saving = ref(false)
  const currentUserData = ref<Partial<UserListItem>>({})

  const searchForm = ref<Api.SystemManage.UserSearchParams>({
    userName: undefined,
    userGender: undefined,
    userPhone: undefined,
    userEmail: undefined,
    status: undefined
  })

  const USER_STATUS_CONFIG = {
    enabled: { type: 'success' as const, text: '启用' },
    disabled: { type: 'info' as const, text: '停用' }
  } as const

  const GENDER_LABELS: Record<string, string> = {
    unknown: '未知',
    male: '男',
    female: '女'
  }

  const getUserStatusConfig = (status: string) =>
    USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG] || {
      type: 'info' as const,
      text: status || '未知'
    }

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
    refreshCreate,
    refreshUpdate,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetUserList,
      apiParams: { current: 1, size: 20, ...searchForm.value },
      columnsFactory: () => [
        { type: 'index', width: 70, label: '序号' },
        { prop: 'userName', label: '用户名', minWidth: 140 },
        {
          prop: 'userGender',
          label: '性别',
          width: 90,
          formatter: (row) => GENDER_LABELS[row.userGender] || '未知'
        },
        { prop: 'nickName', label: '昵称', minWidth: 140 },
        { prop: 'userPhone', label: '手机号', minWidth: 140 },
        { prop: 'userEmail', label: '邮箱', minWidth: 200 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) => {
            const config = getUserStatusConfig(row.status)
            return h(ElTag, { type: config.type }, () => config.text)
          }
        },
        {
          prop: 'userRoles',
          label: '角色权限',
          minWidth: 180,
          formatter: (row: UserListItem) =>
            row.userRoles.length
              ? h(
                  'div',
                  { class: 'flex flex-wrap gap-1' },
                  row.userRoles.map((role) => h(ElTag, { key: role, type: 'primary' }, () => role))
                )
              : h('span', { class: 'text-g-500' }, '未分配')
        },
        {
          prop: 'createTime',
          label: '创建时间',
          minWidth: 180,
          sortable: true,
          formatter: (row: UserListItem) => formatDateTime(row.createTime)
        },
        {
          prop: 'updateTime',
          label: '更新时间',
          minWidth: 180,
          sortable: true,
          formatter: (row: UserListItem) => formatDateTime(row.updateTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: UserListItem) =>
            h('div', { class: 'flex items-center' }, [
              h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
              row.status === 'enabled'
                ? h(ArtButtonTable, { type: 'delete', onClick: () => disableUser(row) })
                : null
            ])
        }
      ]
    }
  })

  const handleSearch = (params: Api.SystemManage.UserSearchParams) => {
    replaceSearchParams(params)
    getData()
  }

  const showDialog = (type: DialogType, row?: UserListItem) => {
    dialogType.value = type
    currentUserData.value = row ? { ...row } : {}
    dialogVisible.value = true
  }

  const handleDialogSubmit = async (payload: Api.SystemManage.UserMutation) => {
    saving.value = true
    try {
      if (dialogType.value === 'add') {
        await fetchCreateUser(payload)
        await refreshCreate()
        ElMessage.success('用户新增成功')
      } else {
        await fetchUpdateUser(currentUserData.value.id!, payload)
        await refreshUpdate()
        ElMessage.success('用户更新成功')
      }
      dialogVisible.value = false
      currentUserData.value = {}
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '保存用户失败'))
    } finally {
      saving.value = false
    }
  }

  const disableUser = async (row: UserListItem) => {
    try {
      await ElMessageBox.confirm(
        `确定要注销用户“${row.userName}”吗？注销后将无法登录。`,
        '注销用户',
        {
          confirmButtonText: '确定注销',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await fetchDeleteUser(row.id)
      await refreshRemove()
      ElMessage.success('用户已注销')
    } catch (error) {
      if (error === 'cancel' || error === 'close') return
      ElMessage.error(getErrorMessage(error, '注销用户失败'))
    }
  }

  const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message
    return Array.isArray(message) ? message.join('；') : message || fallback
  }
</script>
