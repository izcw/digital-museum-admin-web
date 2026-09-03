<!-- 用户管理页面 -->
<template>
  <div class="user-page art-full-height">
    <UserSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetUserList } from '@/api/system-manage'
  import { formatDateTime } from '@/utils/date'
  import UserSearch from './modules/user-search.vue'

  defineOptions({ name: 'User' })

  type UserListItem = Api.SystemManage.UserListItem

  // 空筛选条件会返回数据库中的全部用户。
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

  const getUserStatusConfig = (status: string) => {
    return (
      USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG] || {
        type: 'info' as const,
        text: status || '未知'
      }
    )
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
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetUserList,
      apiParams: {
        current: 1,
        size: 20,
        ...searchForm.value
      },
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
            const statusConfig = getUserStatusConfig(row.status)
            return h(ElTag, { type: statusConfig.type }, () => statusConfig.text)
          }
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
        }
      ]
    }
  })

  const handleSearch = (params: Api.SystemManage.UserSearchParams) => {
    replaceSearchParams(params)
    getData()
  }
</script>
