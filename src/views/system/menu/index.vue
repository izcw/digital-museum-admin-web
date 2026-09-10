<!-- 数据库菜单管理页面 -->
<template>
  <div class="menu-page art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :showExpand="false"
      @reset="handleReset"
      @search="loadMenus"
    />
    <ElCard class="art-table-card">
      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        :show-zebra="false"
        @refresh="loadMenus"
      >
        <template #left>
          <ElButton v-ripple type="primary" @click="handleAdd()">新增菜单</ElButton>
          <ElButton v-ripple @click="toggleExpand">{{
            isExpanded ? '收起全部' : '展开全部'
          }}</ElButton>
        </template>
      </ArtTableHeader>
      <ArtTable
        ref="tableRef"
        row-key="menuId"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :stripe="false"
        :tree-props="{ children: 'children' }"
        :default-expand-all="false"
      />
      <MenuDialog
        v-model:visible="dialogVisible"
        :edit-data="editData"
        :parent-options="parentOptions"
        :loading="saving"
        @submit="handleSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchCreateMenu,
    fetchDeleteMenu,
    fetchGetMenuTree,
    fetchUpdateMenu
  } from '@/api/system-manage'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { formatDateTime } from '@/utils/date'
  import { formatMenuTitle } from '@/utils/router'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import MenuDialog from './components/menu-dialog.vue'

  defineOptions({ name: 'Menus' })
  type MenuListItem = Api.SystemManage.MenuListItem
  type ParentOption = { label: string; value: number; permissionCode: string }

  const loading = ref(false)
  const saving = ref(false)
  const isExpanded = ref(false)
  const tableRef = ref()
  const tableData = ref<MenuListItem[]>([])
  const dialogVisible = ref(false)
  const editData = ref<Partial<MenuListItem> | null>(null)
  const searchForm = ref<Api.SystemManage.MenuSearchParams>({ menuName: '', route: '' })
  const searchItems = computed(() => [
    {
      label: '菜单名称',
      key: 'menuName',
      type: 'input',
      props: { clearable: true, placeholder: '请输入菜单名称或语言键' }
    },
    {
      label: '路由',
      key: 'route',
      type: 'input',
      props: { clearable: true, placeholder: '请输入路由地址' }
    }
  ])
  const typeLabel: Record<MenuListItem['menuType'], string> = {
    directory: '目录',
    menu: '菜单',
    button: '按钮'
  }
  const typeTag: Record<MenuListItem['menuType'], 'info' | 'primary' | 'warning'> = {
    directory: 'info',
    menu: 'primary',
    button: 'warning'
  }

  const { columnChecks, columns } = useTableColumns<MenuListItem>(() => [
    {
      prop: 'menuName',
      label: '菜单名称',
      minWidth: 200,
      formatter: (row) => formatMenuTitle(row.menuName)
    },
    {
      prop: 'menuType',
      label: '类型',
      width: 90,
      formatter: (row) => h(ElTag, { type: typeTag[row.menuType] }, () => typeLabel[row.menuType])
    },
    { prop: 'icon', label: '图标', minWidth: 150 },
    { prop: 'route', label: '路由', minWidth: 170 },
    { prop: 'permissionCode', label: '权限标识', minWidth: 170 },
    { prop: 'sort', label: '排序', width: 80 },
    {
      prop: 'enabled',
      label: '状态',
      width: 90,
      formatter: (row) =>
        h(ElTag, { type: row.enabled ? 'success' : 'warning' }, () =>
          row.enabled ? '启用' : '禁用'
        )
    },
    {
      prop: 'updateTime',
      label: '更新时间',
      width: 180,
      formatter: (row) => formatDateTime(row.updateTime)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 190,
      align: 'right',
      formatter: (row) =>
        h('div', { style: 'text-align:right' }, [
          row.menuType !== 'button'
            ? h(ArtButtonTable, {
                type: 'add',
                title: '新增子节点',
                onClick: () => handleAdd(row.menuId)
              })
            : null,
          h(ArtButtonTable, { type: 'edit', onClick: () => handleEdit(row) }),
          h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
        ])
    }
  ])

  const flattenMenus = (items: MenuListItem[], level = 0): ParentOption[] =>
    items.flatMap((item) =>
      item.menuType === 'button'
        ? []
        : [
            {
              label: `${'　'.repeat(level)}${formatMenuTitle(item.menuName)}`,
              value: item.menuId,
              permissionCode: item.permissionCode
            },
            ...flattenMenus(item.children ?? [], level + 1)
          ]
    )
  const parentOptions = computed(() => flattenMenus(tableData.value))

  const loadMenus = async () => {
    loading.value = true
    try {
      tableData.value = await fetchGetMenuTree({
        menuName: searchForm.value.menuName?.trim() || undefined,
        route: searchForm.value.route?.trim() || undefined
      })
      if (isExpanded.value) await nextTick(expandAll)
    } finally {
      loading.value = false
    }
  }
  const handleReset = () => {
    searchForm.value = { menuName: '', route: '' }
    loadMenus()
  }
  const handleAdd = (parentId: number | null = null) => {
    editData.value = { parentId, menuType: 'menu', sort: 1, enabled: true }
    dialogVisible.value = true
  }
  const handleEdit = (row: MenuListItem) => {
    editData.value = { ...row, routeMeta: { ...row.routeMeta } }
    dialogVisible.value = true
  }
  const handleSubmit = async (payload: Api.SystemManage.MenuMutation & { menuId?: number }) => {
    saving.value = true
    try {
      if (payload.menuId) {
        const { menuId, ...body } = payload
        await fetchUpdateMenu(menuId, body)
        ElMessage.success(`${payload.menuType === 'button' ? '按钮' : '菜单'}已更新`)
      } else {
        await fetchCreateMenu(payload)
        ElMessage.success(`${payload.menuType === 'button' ? '按钮' : '菜单'}已新增`)
      }
      dialogVisible.value = false
      await loadMenus()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '保存失败，请检查权限标识是否重复'))
    } finally {
      saving.value = false
    }
  }
  const handleDelete = async (row: MenuListItem) => {
    const kind = row.menuType === 'button' ? '按钮' : '菜单'
    try {
      await ElMessageBox.confirm(
        `确定删除${kind}“${formatMenuTitle(row.menuName)}”吗？`,
        `删除${kind}`,
        {
          type: 'warning'
        }
      )
      await fetchDeleteMenu(row.menuId)
      ElMessage.success(`${kind}已删除`)
      await loadMenus()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('删除失败，请先删除子节点')
    }
  }
  const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message
    return Array.isArray(message) ? message.join('；') : message || fallback
  }
  const visitRows = (rows: MenuListItem[], callback: (row: MenuListItem) => void) =>
    rows.forEach((row) => {
      callback(row)
      if (row.children?.length) visitRows(row.children, callback)
    })
  const expandAll = () =>
    visitRows(tableData.value, (row) => tableRef.value?.elTableRef?.toggleRowExpansion(row, true))
  const toggleExpand = async () => {
    isExpanded.value = !isExpanded.value
    await nextTick()
    visitRows(tableData.value, (row) =>
      tableRef.value?.elTableRef?.toggleRowExpansion(row, isExpanded.value)
    )
  }
  onMounted(loadMenus)
</script>
