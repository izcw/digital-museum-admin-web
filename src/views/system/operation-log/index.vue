<template>
  <div class="operation-log-page art-full-height">
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
    fetchClearOperationLogs,
    fetchDeleteOperationLog,
    fetchExportOperationLogs,
    fetchGetOperationLog,
    fetchGetOperationLogList
  } from '@/api/system-manage'
  import LogDetailDrawer from './components/log-detail-drawer.vue'
  import LogSearch from './components/log-search.vue'

  defineOptions({ name: 'OperationLog' })
  type LogItem = Api.SystemManage.OperationLogItem
  type SearchForm = Api.SystemManage.OperationLogSearchParams & { daterange?: string[] }
  const searchForm = ref<SearchForm>({})
  const selectedRows = ref<LogItem[]>([])
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const detail = ref<LogItem>()
  let detailRequestId = 0
  const appliedFilters = ref<Api.SystemManage.OperationLogSearchParams>({})

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
      apiFn: fetchGetOperationLogList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'logCode', label: '日志编号', minWidth: 130, fixed: 'left' },
        { prop: 'module', label: '系统模块', minWidth: 130 },
        {
          prop: 'operationType',
          label: '操作类型',
          width: 110,
          formatter: (row: LogItem) => h(ElTag, { type: 'info' }, () => row.operationType)
        },
        { prop: 'operatorName', label: '操作人员', minWidth: 120 },
        { prop: 'ipAddress', label: '操作地址', minWidth: 140 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: LogItem) =>
            h(ElTag, { type: row.status === 'success' ? 'success' : 'danger' }, () =>
              row.status === 'success' ? '成功' : '失败'
            )
        },
        {
          prop: 'operationTime',
          label: '操作日期',
          minWidth: 180,
          sortable: true,
          formatter: (row: LogItem) => formatDateTime(row.operationTime)
        },
        {
          prop: 'durationMs',
          label: '消耗时间',
          width: 110,
          formatter: (row: LogItem) => `${row.durationMs} 毫秒`
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
      const result = await fetchGetOperationLog(row.id)
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
      await fetchDeleteOperationLog(row.id)
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
      await Promise.all(selectedRows.value.map((row) => fetchDeleteOperationLog(row.id)))
      selectedRows.value = []
      await refreshRemove()
      ElMessage.success('选中日志已删除')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('批量删除失败')
    }
  }
  const clearLogs = async () => {
    try {
      await ElMessageBox.confirm('将永久清空全部操作日志，确定继续吗？', '清空操作日志', {
        type: 'warning',
        confirmButtonText: '确定清空'
      })
      await fetchClearOperationLogs()
      selectedRows.value = []
      replaceSearchParams(appliedFilters.value)
      await refreshData()
      ElMessage.success('操作日志已清空')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('清空日志失败')
    }
  }
  const exportLogs = async () => {
    try {
      download(await fetchExportOperationLogs(appliedFilters.value), `操作日志-${Date.now()}.csv`)
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
