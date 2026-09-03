<template>
  <ElDialog
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    :model-value="visible"
    width="680px"
    align-center
    @update:model-value="handleCancel"
    @closed="resetForm"
  >
    <ArtForm
      ref="formRef"
      v-model="form"
      :items="formItems"
      :rules="rules"
      :span="12"
      :gutter="20"
      label-width="90px"
      :show-reset="false"
      :show-submit="false"
    />
    <template #footer>
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormRules } from 'element-plus'
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtForm from '@/components/core/forms/art-form/index.vue'

  type MenuListItem = Api.SystemManage.MenuListItem
  type MenuForm = Api.SystemManage.MenuMutation & { menuId?: number }
  const props = withDefaults(
    defineProps<{
      visible: boolean
      editData?: Partial<MenuListItem> | null
      parentOptions?: Array<{ label: string; value: number }>
    }>(),
    {
      editData: null,
      parentOptions: () => []
    }
  )
  const emit = defineEmits<{
    (event: 'update:visible', value: boolean): void
    (event: 'submit', data: MenuForm): void
  }>()
  const formRef = ref()
  const initialForm = (): MenuForm => ({
    parentId: null,
    menuName: '',
    menuType: 'menu',
    icon: '',
    route: '',
    permissionCode: '',
    sort: 0,
    enabled: true
  })
  const form = reactive<MenuForm>(initialForm())
  const isEdit = computed(() => Boolean(form.menuId))
  const availableParents = computed(() => [
    { label: '顶级菜单', value: null },
    ...props.parentOptions.filter((option) => option.value !== form.menuId)
  ])
  const formItems = computed<FormItem[]>(() => [
    {
      label: '父级菜单',
      key: 'parentId',
      type: 'select',
      span: 24,
      props: {
        options: availableParents.value,
        clearable: true,
        placeholder: '请选择父级菜单',
        style: { width: '100%' }
      }
    },
    {
      label: '菜单类型',
      key: 'menuType',
      type: 'select',
      props: {
        options: [
          { label: '目录', value: 'directory' },
          { label: '菜单', value: 'menu' },
          { label: '按钮', value: 'button' }
        ],
        style: { width: '100%' }
      }
    },
    { label: '菜单名称', key: 'menuName', type: 'input', props: { maxlength: 50 } },
    {
      label: '路由地址',
      key: 'route',
      type: 'input',
      props: { placeholder: '/system/user', maxlength: 200 }
    },
    {
      label: '权限标识',
      key: 'permissionCode',
      type: 'input',
      props: { placeholder: 'system:user', maxlength: 100 }
    },
    {
      label: '图标',
      key: 'icon',
      type: 'input',
      props: { placeholder: 'ri:user-line', maxlength: 100 }
    },
    {
      label: '排序',
      key: 'sort',
      type: 'number',
      props: { min: 0, controlsPosition: 'right', style: { width: '100%' } }
    },
    { label: '是否启用', key: 'enabled', type: 'switch' }
  ])
  const rules = reactive<FormRules>({
    menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    menuType: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
    permissionCode: [{ required: true, message: '请输入权限标识', trigger: 'blur' }]
  })
  const resetForm = () => {
    Object.assign(form, initialForm())
    formRef.value?.clearValidate?.()
  }
  watch(
    () => props.visible,
    (visible) => {
      if (!visible) return
      resetForm()
      Object.assign(form, props.editData ?? {})
    }
  )
  const handleSubmit = async () => {
    await formRef.value?.validate()
    emit('submit', { ...form })
    emit('update:visible', false)
  }
  const handleCancel = () => emit('update:visible', false)
</script>
