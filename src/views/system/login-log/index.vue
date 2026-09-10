<template>
  <div class="login-log-page art-full-height">
    <LogSearch v-model="searchForm" @search="handleSearch" @reset="handleReset" />
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace>
            <ElButton type="danger" plain :disabled="!selectedRows.length" @click="deleteSelected"
              >删除</ElButton
            >
            <ElButton type="danger" plain @click="clearLogs">清空</ElButton>
            <ElButton @click="exportLogs">导出</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
    <LogDetailDrawer v-model="detailVisible" :data="detail" :loading="detailLoading" />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { formatDateTime } from '@/utils/date'
  import {
    fetchClearLoginLogs,
    fetchDeleteLoginLog,
    fetchExportLoginLogs,
    fetchGetLoginLog,
    fetchGetLoginLogList
  } from '@/api/system-manage'
  import LogDetailDrawer from './components/log-detail-drawer.vue'
  import LogSearch from './components/log-search.vue'

  defineOptions({ name: 'LoginLog' })
  type LogItem = Api.SystemManage.LoginLogItem
  type SearchForm = Api.SystemManage.LoginLogSearchParams & { daterange?: string[] }
  const searchForm = ref<SearchForm>({})
  const selectedRows = ref<LogItem[]>([])
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const detail = ref<LogItem>()
  let detailRequestId = 0
  const appliedFilters = ref<Api.SystemManage.LoginLogSearchParams>({})

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
      apiFn: fetchGetLoginLogList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'logCode', label: '访问编号', minWidth: 140, fixed: 'left' },
        {
          prop: 'userId',
          label: '用户 ID',
          width: 100,
          formatter: (row: LogItem) => row.userId ?? '-'
        },
        { prop: 'username', label: '用户名称', minWidth: 120 },
        { prop: 'deviceType', label: '设备类型', width: 110 },
        { prop: 'ipAddress', label: '地址', minWidth: 140 },
        { prop: 'location', label: '登录地点', width: 110 },
        { prop: 'operatingSystem', label: '操作系统', minWidth: 140 },
        { prop: 'browser', label: '浏览器', width: 110 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: LogItem) =>
            h(ElTag, { type: row.status === 'success' ? 'success' : 'danger' }, () =>
              row.status === 'success' ? '成功' : '失败'
            )
        },
        { prop: 'description', label: '描述', minWidth: 160, showOverflowTooltip: true },
        {
          prop: 'loginTime',
          label: '访问时间',
          minWidth: 180,
          sortable: true,
          formatter: (row: LogItem) => formatDateTime(row.loginTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 110,
          fixed: 'right',
          formatter: (row: LogItem) =>
            h('div', { class: 'flex items-center' }, [
              h(ArtButtonTable, {
                type: 'view',
                role: 'button',
                tabindex: 0,
                'aria-label': '查看',
                onClick: () => openDetail(row),
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter') openDetail(row)
                }
              }),
              h(ArtButtonTable, {
                type: 'delete',
                role: 'button',
                tabindex: 0,
                'aria-label': '删除日志',
                onClick: () => deleteOne(row),
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter') deleteOne(row)
                }
              })
            ])
        }
      ]
    }
  })

  const toFilters = (params: SearchForm) => {
    const { daterange, ...filters } = params
    const [start, end] = daterange ?? []
    return {
      ...filters,
      startTime: start ? new Date(`${start}T00:00:00`).toISOString() : undefined,
      endTime: end ? new Date(`${end}T23:59:59.999`).toISOString() : undefined
    }
  }
  const handleSearch = (params: SearchForm) => {
    appliedFilters.value = toFilters(params)
    replaceSearchParams(appliedFilters.value)
    getData()
  }
  const handleReset = async () => {
    searchForm.value = {}
    appliedFilters.value = {}
    await resetSearchParams()
  }
  const openDetail = async (row: LogItem) => {
    const requestId = ++detailRequestId
    detail.value = undefined
    detailVisible.value = true
    detailLoading.value = true
    try {
      const result = await fetchGetLoginLog(row.id)
      if (requestId === detailRequestId) detail.value = result
    } catch {
      if (requestId === detailRequestId) {
        detailVisible.value = false
        ElMessage.error('获取日志详情失败')
      }
    } finally {
      if (requestId === detailRequestId) detailLoading.value = false
    }
  }
  const deleteOne = async (row: LogItem) => {
    try {
      await ElMessageBox.confirm(`确定删除日志“${row.logCode}”吗？`, '删除日志', {
        type: 'warning'
      })
      await fetchDeleteLoginLog(row.id)
      await refreshRemove()
      ElMessage.success('日志已删除')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('删除日志失败')
    }
  }
  const deleteSelected = async () => {
    try {
      await ElMessageBox.confirm(
        `确定删除选中的 ${selectedRows.value.length} 条日志吗？`,
        '批量删除',
        { type: 'warning' }
      )
      await Promise.all(selectedRows.value.map((row) => fetchDeleteLoginLog(row.id)))
      selectedRows.value = []
      await refreshRemove()
      ElMessage.success('选中日志已删除')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('批量删除失败')
    }
  }
  const clearLogs = async () => {
    try {
      await ElMessageBox.confirm('将永久清空全部登录日志，确定继续吗？', '清空登录日志', {
        type: 'warning',
        confirmButtonText: '确定清空'
      })
      await fetchClearLoginLogs()
      selectedRows.value = []
      replaceSearchParams(appliedFilters.value)
      await refreshData()
      ElMessage.success('登录日志已清空')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('清空日志失败')
    }
  }
  const exportLogs = async () => {
    try {
      download(await fetchExportLoginLogs(appliedFilters.value), `登录日志-${Date.now()}.csv`)
      ElMessage.success('导出成功')
    } catch {
      ElMessage.error('导出失败')
    }
  }
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }
</script>
