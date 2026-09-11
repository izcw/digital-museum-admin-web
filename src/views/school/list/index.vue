<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left
          ><ElButton v-if="canManage" v-ripple @click="showDialog()">新增学校</ElButton></template
        >
      </ArtTableHeader>
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        :empty-text="
          hasSearch
            ? '没有匹配的学校，请调整条件或重置筛选'
            : '尚未添加学校，点击上方新增学校开始添加'
        "
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
    <EditDialog
      v-model:visible="dialogVisible"
      :row="currentRow"
      :loading="saving"
      @submit="save"
    />
    <DetailDrawer
      v-model:visible="detailVisible"
      :school-id="detailSchoolId"
      @saved="refreshUpdate"
    />
  </div>
</template>
<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { useTable } from '@/hooks/core/useTable'
  import { formatDateTime } from '@/utils/date'
  import {
    listSchools,
    removeSchool,
    saveSchool,
    schoolError,
    type SchoolMutation,
    statusOptions,
    type School,
    type SearchParams
  } from '../shared/school-data'
  import EditDialog from './components/edit-dialog.vue'
  import DetailDrawer from './components/detail-drawer.vue'

  defineOptions({ name: 'SchoolList' })
  const userStore = useUserStore()
  const canManage = computed(() => !userStore.info.schoolId)
  const searchForm = ref<SearchParams>({})
  const searchItems = computed(() => [
    {
      key: 'name',
      label: '学校名称',
      type: 'input',
      props: { clearable: true, placeholder: '请输入学校名称' }
    },
    {
      key: 'code',
      label: '学校编码',
      type: 'input',
      props: { clearable: true, placeholder: '请输入学校编码' }
    },
    {
      key: 'region',
      label: '所在地区',
      type: 'input',
      props: { clearable: true, placeholder: '请输入所在地区' }
    },

    {
      key: 'status',
      label: '状态',
      type: 'select',
      props: { clearable: true, placeholder: '请选择状态', options: statusOptions }
    }
  ])

  const detailVisible = ref(false)
  const detailSchoolId = ref('')
  const saving = ref(false)
  const hasSearch = ref(false)
  const dialogVisible = ref(false)
  const currentRow = ref<School>()
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
      apiFn: listSchools,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { type: 'index', width: 70, label: '序号' },
        { prop: 'name', label: '学校名称', minWidth: 240 },
        { prop: 'code', label: '学校编码', minWidth: 120 },
        { prop: 'region', label: '所在地区', minWidth: 160 },
        { prop: 'address', label: '学校地址', minWidth: 240 },
        {
          prop: 'adminCount',
          label: '管理员数量',
          width: 120,
          formatter: (row) => row.adminCount
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) =>
            h(ElTag, { type: row.status === 'enabled' ? 'success' : 'info' }, () =>
              row.status === 'enabled' ? '启用' : '停用'
            )
        },
        { prop: 'remark', label: '备注', minWidth: 180 },
        {
          prop: 'createTime',
          label: '创建时间',
          minWidth: 180,
          sortable: true,
          formatter: (row) => formatDateTime(row.createTime)
        },
        {
          prop: 'updateTime',
          label: '更新时间',
          minWidth: 180,
          sortable: true,
          formatter: (row) => formatDateTime(row.updateTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 270,
          fixed: 'right',
          formatter: (row) =>
            h('div', { class: 'flex items-center' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => showDetail(row) },
                () => '查看详情'
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  disabled: !canManage.value,
                  onClick: () => showDialog(row)
                },
                () => '编辑'
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: row.status === 'enabled' ? 'danger' : 'success',
                  disabled: !canManage.value,
                  onClick: () => toggleStatus(row)
                },
                () => (row.status === 'enabled' ? '停用' : '启用')
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'danger',
                  disabled: !canManage.value || row.status === 'enabled',
                  title: row.status === 'enabled' ? '请先停用学校' : '',
                  onClick: () => handleDelete(row)
                },
                () => '删除'
              )
            ])
        }
      ]
    }
  })
  function handleSearch(params: SearchParams) {
    hasSearch.value = Object.values(params).some((value) => value !== undefined && value !== '')
    replaceSearchParams(params)
    getData()
  }
  function handleReset() {
    hasSearch.value = false
    resetSearchParams()
  }
  function showDetail(row: School) {
    detailSchoolId.value = row.id
    detailVisible.value = true
  }
  function showDialog(row?: School) {
    currentRow.value = row ? { ...row } : undefined
    dialogVisible.value = true
  }
  async function save(payload: SchoolMutation) {
    if (saving.value) return
    saving.value = true
    try {
      await saveSchool(payload, currentRow.value?.id)
      dialogVisible.value = false
      if (currentRow.value) await refreshUpdate()
      else await refreshCreate()
      ElMessage.success('学校已保存')
    } catch (error) {
      ElMessage.error(schoolError(error))
    } finally {
      saving.value = false
    }
  }
  async function toggleStatus(row: School) {
    const action = row.status === 'enabled' ? '停用' : '启用'
    try {
      await ElMessageBox.confirm(
        `确定${action}“${row.name}”吗？${row.status === 'enabled' ? '停用后所属管理员无法登录，已有会话将失效。' : '启用后，启用状态的管理员可重新登录。'}`,
        `${action}学校`,
        {
          type: 'warning',
          confirmButtonText: `确定${action}`,
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }
    try {
      await saveSchool({ status: row.status === 'enabled' ? 'disabled' : 'enabled' }, row.id)
      await refreshUpdate()
      ElMessage.success(`已${action}`)
    } catch (error) {
      ElMessage.error(schoolError(error))
    }
  }
  async function handleDelete(row: School) {
    try {
      await ElMessageBox.confirm(
        `确定删除已停用的学校“${row.name}”吗？有关联的管理员或设备时将无法删除。`,
        '删除学校',
        { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
    try {
      await removeSchool(row.id)
      await refreshRemove()
      ElMessage.success('学校已删除')
    } catch (error) {
      ElMessage.error(schoolError(error, '学校删除失败'))
    }
  }

  // 路由使用 keep-alive；再次进入时同步另一个页面的学校和管理员修改。
  onActivated(() => {
    refreshData()
  })
</script>
