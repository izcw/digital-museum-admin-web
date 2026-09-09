<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="resetSearchParams"
    />
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left
          ><ElButton v-if="canManage" v-ripple @click="showDialog()"
            >新增学校管理员</ElButton
          ></template
        >
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
    <EditDialog
      v-model:visible="dialogVisible"
      :row="currentRow"
      :loading="saving"
      @submit="save"
    />
  </div>
</template>
<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { useTable } from '@/hooks/core/useTable'
  import { formatDateTime } from '@/utils/date'
  import {
    listAdmins,
    saveSchoolAdmin,
    schools,
    loadSchoolOptions,
    schoolError,
    type AdminMutation,
    statusOptions,
    type SchoolAdmin,
    type SearchParams
  } from '../shared/school-data'
  import EditDialog from './modules/edit-dialog.vue'

  defineOptions({ name: 'SchoolAdmin' })
  const userStore = useUserStore()
  const canManage = computed(() => !userStore.info.schoolId)
  const searchForm = ref<SearchParams>({})
  const searchItems = computed(() => [
    {
      key: 'userName',
      label: '用户名',
      type: 'input',
      props: { clearable: true, placeholder: '请输入用户名' }
    },
    {
      key: 'name',
      label: '姓名',
      type: 'input',
      props: { clearable: true, placeholder: '请输入姓名' }
    },
    {
      key: 'phone',
      label: '联系电话',
      type: 'input',
      props: { clearable: true, placeholder: '请输入联系电话' }
    },
    {
      key: 'schoolId',
      label: '所属学校',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        placeholder: '请选择学校',
        options: schools.map((school) => ({ label: school.name, value: school.id }))
      }
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      props: { clearable: true, placeholder: '请选择状态', options: statusOptions }
    }
  ])
  const saving = ref(false)
  const dialogVisible = ref(false)
  const currentRow = ref<SchoolAdmin>()
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
    refreshUpdate
  } = useTable({
    core: {
      apiFn: listAdmins,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { type: 'index', width: 70, label: '序号' },
        { prop: 'userName', label: '用户名', minWidth: 160 },
        { prop: 'name', label: '姓名', minWidth: 100 },
        {
          prop: 'schoolId',
          label: '所属学校',
          minWidth: 220,
          formatter: (row) => row.schoolName
        },
        { prop: 'phone', label: '联系电话', minWidth: 160 },
        { prop: 'email', label: '邮箱', minWidth: 200 },
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
          width: 150,
          fixed: 'right',
          formatter: (row) =>
            h('div', { class: 'flex items-center' }, [
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
              )
            ])
        }
      ]
    }
  })
  function handleSearch(params: SearchParams) {
    replaceSearchParams(params)
    getData()
  }
  function showDialog(row?: SchoolAdmin) {
    currentRow.value = row ? { ...row } : undefined
    dialogVisible.value = true
  }
  async function save(payload: AdminMutation) {
    if (saving.value) return
    saving.value = true
    try {
      await saveSchoolAdmin(payload, currentRow.value?.id)
      dialogVisible.value = false
      if (currentRow.value) await refreshUpdate()
      else await refreshCreate()
      ElMessage.success('学校管理员已保存')
    } catch (error) {
      ElMessage.error(schoolError(error))
    } finally {
      saving.value = false
    }
  }
  async function toggleStatus(row: SchoolAdmin) {
    const action = row.status === 'enabled' ? '停用' : '启用'
    try {
      await ElMessageBox.confirm(
        `确定${action}“${row.userName}”吗？${row.status === 'enabled' ? '停用后无法登录，已有会话将失效。' : ''}`,
        `${action}学校管理员`,
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
      await saveSchoolAdmin({ status: row.status === 'enabled' ? 'disabled' : 'enabled' }, row.id)
      await refreshUpdate()
      ElMessage.success(`已${action}`)
    } catch (error) {
      ElMessage.error(schoolError(error))
    }
  }

  // 路由使用 keep-alive；再次进入时同步另一个页面的学校和管理员修改。
  onActivated(() => {
    refreshData()
    loadSchoolOptions().catch((error) => ElMessage.error(schoolError(error, '学校选项加载失败')))
  })
</script>
