<template>
  <ElDialog
    v-model="visible"
    :title="`菜单权限 - ${roleData?.roleName ?? ''}`"
    width="560px"
    align-center
    class="el-dialog-border"
    :close-on-click-modal="false"
    @close="resetTree"
  >
    <ElScrollbar v-loading="loading" height="65vh">
      <ElTree
        ref="treeRef"
        :data="menuTree"
        show-checkbox
        check-strictly
        node-key="menuId"
        :default-expand-all="isExpandAll"
        :props="treeProps"
        @check="handleTreeCheck"
      >
        <template #default="{ data }">
          <span>{{ formatMenuTitle(data.menuName) }}</span>
          <ElTag v-if="data.menuType === 'button'" class="ml-2" size="small" type="warning">
            按钮
          </ElTag>
        </template>
      </ElTree>
    </ElScrollbar>
    <template #footer>
      <ElButton :disabled="loading || saving" @click="toggleExpandAll">
        {{ isExpandAll ? '全部收起' : '全部展开' }}
      </ElButton>
      <ElButton :disabled="loading || saving" @click="toggleSelectAll">
        {{ isSelectAll ? '取消全选' : '全部选择' }}
      </ElButton>
      <ElButton type="primary" :loading="saving" @click="savePermission">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { fetchGetMenuTree, fetchGetRoleMenuIds, fetchUpdateRoleMenus } from '@/api/system-manage'
  import { formatMenuTitle } from '@/utils/router'

  type RoleListItem = Api.SystemManage.RoleListItem
  type MenuListItem = Api.SystemManage.MenuListItem

  const props = withDefaults(defineProps<{ modelValue: boolean; roleData?: RoleListItem }>(), {
    modelValue: false,
    roleData: undefined
  })
  const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void
    (event: 'success'): void
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const treeRef = ref()
  const menuTree = ref<MenuListItem[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const isExpandAll = ref(true)
  const isSelectAll = ref(false)
  const treeProps = { children: 'children', label: 'menuName' }

  const getAllMenuIds = (nodes: MenuListItem[]): number[] =>
    nodes.flatMap((node) => [node.menuId, ...getAllMenuIds(node.children ?? [])])

  const loadPermission = async () => {
    if (!props.roleData) return
    loading.value = true
    try {
      const [tree, permission] = await Promise.all([
        fetchGetMenuTree(),
        fetchGetRoleMenuIds(props.roleData.roleId)
      ])
      menuTree.value = tree
      await nextTick()
      treeRef.value?.setCheckedKeys(permission.menuIds)
      handleTreeCheck()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '角色菜单权限加载失败'))
    } finally {
      loading.value = false
    }
  }
  watch(
    () => props.modelValue,
    (open) => open && loadPermission()
  )

  const savePermission = async () => {
    if (!props.roleData || !treeRef.value) return
    saving.value = true
    try {
      const menuIds = (treeRef.value.getCheckedKeys() as Array<string | number>).map(Number)
      await fetchUpdateRoleMenus(props.roleData.roleId, menuIds)
      ElMessage.success('菜单权限保存成功')
      emit('success')
      visible.value = false
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '菜单权限保存失败'))
    } finally {
      saving.value = false
    }
  }
  const toggleExpandAll = () => {
    if (!treeRef.value) return
    Object.values(treeRef.value.store.nodesMap).forEach((node: any) => {
      node.expanded = !isExpandAll.value
    })
    isExpandAll.value = !isExpandAll.value
  }
  const toggleSelectAll = () => {
    if (!treeRef.value) return
    treeRef.value.setCheckedKeys(isSelectAll.value ? [] : getAllMenuIds(menuTree.value))
    isSelectAll.value = !isSelectAll.value
  }
  const handleTreeCheck = () => {
    const allIds = getAllMenuIds(menuTree.value)
    const checked = treeRef.value?.getCheckedKeys() ?? []
    isSelectAll.value = allIds.length > 0 && checked.length === allIds.length
  }
  const resetTree = () => {
    treeRef.value?.setCheckedKeys([])
    menuTree.value = []
    isSelectAll.value = false
  }
  const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message
    return Array.isArray(message) ? message.join('；') : message || fallback
  }
</script>
