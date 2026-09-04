<template>
  <ElDialog
    :title="dialogTitle"
    :model-value="visible"
    width="860px"
    align-center
    class="menu-dialog"
    :close-on-click-modal="false"
    @update:model-value="handleCancel"
    @closed="resetForm"
  >
    <ArtForm
      ref="formRef"
      v-model="form"
      :items="formItems"
      :rules="rules"
      :span="width > 640 ? 12 : 24"
      :gutter="20"
      label-width="100px"
      :show-reset="false"
      :show-submit="false"
    >
      <template #menuCategory>
        <ElRadioGroup v-model="form.menuCategory" :disabled="isEdit">
          <ElRadioButton value="menu">菜单</ElRadioButton>
          <ElRadioButton value="button">按钮</ElRadioButton>
        </ElRadioGroup>
      </template>
    </ArtForm>

    <template #footer>
      <ElButton :disabled="loading" @click="handleCancel">取 消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">确 定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormRules } from 'element-plus'
  import { ElIcon, ElTooltip } from 'element-plus'
  import { QuestionFilled } from '@element-plus/icons-vue'
  import { useWindowSize } from '@vueuse/core'
  import type { FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtForm from '@/components/core/forms/art-form/index.vue'
  import { formatMenuTitle } from '@/utils/router'

  type MenuListItem = Api.SystemManage.MenuListItem
  type MenuForm = Api.SystemManage.MenuMutation & { menuId?: number }
  type ParentOption = { label: string; value: number; permissionCode: string }

  interface EditorForm {
    menuId?: number
    parentId: number | null
    menuCategory: 'menu' | 'button'
    storedMenuType: MenuListItem['menuType']
    menuName: string
    route: string
    routeName: string
    component: string
    icon: string
    permissionCode: string
    sort: number
    enabled: boolean
    roles: string[]
    link: string
    textBadge: string
    activePath: string
    keepAlive: boolean
    isHide: boolean
    isIframe: boolean
    showBadge: boolean
    fixedTab: boolean
    isHideTab: boolean
    isFullPage: boolean
    permissionName: string
    buttonPermission: string
  }

  const props = withDefaults(
    defineProps<{
      visible: boolean
      editData?: Partial<MenuListItem> | null
      parentOptions?: ParentOption[]
      loading?: boolean
    }>(),
    { editData: null, parentOptions: () => [], loading: false }
  )
  const emit = defineEmits<{
    (event: 'update:visible', value: boolean): void
    (event: 'submit', data: MenuForm): void
  }>()

  const { width } = useWindowSize()
  const formRef = ref()
  let originalMenuName = ''
  let displayedMenuName = ''
  let originalParentId: number | null = null
  let originalPermissionCode = ''
  let originalButtonPermission = ''

  const initialForm = (): EditorForm => ({
    parentId: null,
    menuCategory: 'menu',
    storedMenuType: 'menu',
    menuName: '',
    route: '',
    routeName: '',
    component: '',
    icon: '',
    permissionCode: '',
    sort: 1,
    enabled: true,
    roles: [],
    link: '',
    textBadge: '',
    activePath: '',
    keepAlive: false,
    isHide: false,
    isIframe: false,
    showBadge: false,
    fixedTab: false,
    isHideTab: false,
    isFullPage: false,
    permissionName: '',
    buttonPermission: ''
  })
  const form = reactive<EditorForm>(initialForm())
  const isEdit = computed(() => Boolean(form.menuId))
  const dialogTitle = computed(
    () => `${isEdit.value ? '编辑' : '新建'}${form.menuCategory === 'button' ? '按钮' : '菜单'}`
  )
  const availableParents = computed(() => [
    { label: '顶级菜单', value: null },
    ...props.parentOptions.filter((option) => option.value !== form.menuId)
  ])

  const createLabelTooltip = (label: string, tooltip: string) => () =>
    h('span', { class: 'flex items-center' }, [
      h('span', label),
      h(ElTooltip, { content: tooltip, placement: 'top' }, () =>
        h(ElIcon, { class: 'ml-0.5 cursor-help' }, () => h(QuestionFilled))
      )
    ])

  const formItems = computed<FormItem[]>(() => {
    const commonItems: FormItem[] = [
      { label: '菜单类型', key: 'menuCategory', span: 24 },
      {
        label: '所属菜单',
        key: 'parentId',
        type: 'select',
        span: 12,
        props: {
          options: availableParents.value,
          clearable: true,
          placeholder: form.menuCategory === 'button' ? '请选择按钮所属菜单' : '请选择父级菜单',
          style: { width: '100%' }
        }
      }
    ]

    if (form.menuCategory === 'button') {
      return [
        ...commonItems,
        {
          label: '权限名称',
          key: 'permissionName',
          type: 'input',
          props: { placeholder: '如：新增、编辑、删除', maxlength: 50 }
        },
        {
          label: '权限标识',
          key: 'buttonPermission',
          type: 'input',
          props: { placeholder: '如：add、edit、delete', maxlength: 100 }
        },
        {
          label: '权限排序',
          key: 'sort',
          type: 'number',
          props: { min: 0, controlsPosition: 'right', style: { width: '100%' } }
        },
        { label: '是否启用', key: 'enabled', type: 'switch' }
      ]
    }

    const switchSpan = width.value < 640 ? 12 : 6
    return [
      ...commonItems,
      { label: '菜单名称', key: 'menuName', type: 'input', props: { maxlength: 50 } },
      {
        label: createLabelTooltip(
          '路由地址',
          '一级菜单使用以 / 开头的绝对路径；二级及以下可使用相对路径。'
        ),
        key: 'route',
        type: 'input',
        props: { placeholder: '如：/dashboard 或 user', maxlength: 200 }
      },
      {
        label: createLabelTooltip('路由名称', 'Vue Router 的唯一 name，如 Dashboard、User。'),
        key: 'routeName',
        type: 'input',
        props: { placeholder: '如：Dashboard', maxlength: 100 }
      },
      {
        label: createLabelTooltip(
          '组件路径',
          '布局菜单填写 /index/index；具体页面填写 /system/user；目录可留空。'
        ),
        key: 'component',
        type: 'input',
        props: { placeholder: '如：/system/user', maxlength: 200 }
      },
      { label: '图标', key: 'icon', type: 'input', props: { placeholder: '如：ri:user-line' } },
      {
        label: createLabelTooltip('权限编码', '后端 RBAC 权限编码，如 system:user。'),
        key: 'permissionCode',
        type: 'input',
        props: { placeholder: '如：system:user', maxlength: 100 }
      },
      {
        label: '角色权限',
        key: 'roles',
        type: 'inputtag',
        props: { placeholder: '前端权限模式使用；输入后按回车' }
      },
      {
        label: '菜单排序',
        key: 'sort',
        type: 'number',
        props: { min: 0, controlsPosition: 'right', style: { width: '100%' } }
      },
      {
        label: '外部链接',
        key: 'link',
        type: 'input',
        props: { placeholder: 'https://example.com' }
      },
      {
        label: '文本徽章',
        key: 'textBadge',
        type: 'input',
        props: { placeholder: '如：New、Hot' }
      },
      {
        label: createLabelTooltip('激活路径', '隐藏详情页可指定需要高亮的父菜单路径。'),
        key: 'activePath',
        type: 'input',
        props: { placeholder: '如：/system/user' }
      },
      { label: '是否启用', key: 'enabled', type: 'switch', span: switchSpan },
      { label: '页面缓存', key: 'keepAlive', type: 'switch', span: switchSpan },
      { label: '隐藏菜单', key: 'isHide', type: 'switch', span: switchSpan },
      { label: '是否内嵌', key: 'isIframe', type: 'switch', span: switchSpan },
      { label: '显示徽章', key: 'showBadge', type: 'switch', span: switchSpan },
      { label: '固定标签', key: 'fixedTab', type: 'switch', span: switchSpan },
      { label: '标签隐藏', key: 'isHideTab', type: 'switch', span: switchSpan },
      { label: '全屏页面', key: 'isFullPage', type: 'switch', span: switchSpan }
    ]
  })

  const rules = computed<FormRules>(() => ({
    parentId:
      form.menuCategory === 'button'
        ? [{ required: true, message: '请选择按钮所属菜单', trigger: 'change' }]
        : [],
    menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    route: [{ required: true, message: '请输入路由地址', trigger: 'blur' }],
    routeName: [{ required: true, message: '请输入路由名称', trigger: 'blur' }],
    permissionCode: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
    permissionName: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
    buttonPermission: [{ required: true, message: '请输入权限标识', trigger: 'blur' }]
  }))

  const stringValue = (value: unknown) => (typeof value === 'string' ? value : '')
  const booleanValue = (value: unknown, fallback = false) =>
    typeof value === 'boolean' ? value : fallback
  const stringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

  const loadFormData = () => {
    const row = props.editData
    const meta = row?.routeMeta ?? {}
    const isButton = row?.menuType === 'button'
    originalMenuName = row?.menuName ?? ''
    displayedMenuName = originalMenuName ? formatMenuTitle(originalMenuName) : ''
    originalParentId = row?.parentId ?? null
    originalPermissionCode = row?.permissionCode ?? ''
    originalButtonPermission =
      stringValue(meta.authMark) || originalPermissionCode.split(':').pop() || ''

    Object.assign(form, initialForm(), {
      menuId: row?.menuId,
      parentId: row?.parentId ?? null,
      menuCategory: isButton ? 'button' : 'menu',
      storedMenuType: row?.menuType ?? 'menu',
      menuName: displayedMenuName,
      route: row?.route ?? '',
      routeName: row?.routeName ?? '',
      component: row?.component ?? '',
      icon: row?.icon ?? '',
      permissionCode: row?.permissionCode ?? '',
      sort: row?.sort ?? 1,
      enabled: row?.enabled ?? true,
      roles: stringArray(meta.roles),
      link: stringValue(meta.link),
      textBadge: stringValue(meta.showTextBadge),
      activePath: stringValue(meta.activePath),
      keepAlive: booleanValue(meta.keepAlive),
      isHide: booleanValue(meta.isHide),
      isIframe: booleanValue(meta.isIframe),
      showBadge: booleanValue(meta.showBadge),
      fixedTab: booleanValue(meta.fixedTab),
      isHideTab: booleanValue(meta.isHideTab),
      isFullPage: booleanValue(meta.isFullPage),
      permissionName: isButton ? displayedMenuName : '',
      buttonPermission: isButton ? originalButtonPermission : ''
    })
  }

  const buildButtonPermissionCode = () => {
    const authMark = form.buttonPermission.trim()
    if (
      form.parentId === originalParentId &&
      authMark === originalButtonPermission &&
      originalPermissionCode
    ) {
      return originalPermissionCode
    }
    if (authMark.includes(':')) return authMark
    const parentCode = props.parentOptions.find(
      (item) => item.value === form.parentId
    )?.permissionCode
    return parentCode ? `${parentCode}:${authMark}` : authMark
  }

  const buildPayload = (): MenuForm => {
    const existingMeta = props.editData?.routeMeta ?? {}
    if (form.menuCategory === 'button') {
      return {
        menuId: form.menuId,
        parentId: form.parentId,
        menuName: form.permissionName.trim(),
        menuType: 'button',
        icon: form.icon,
        route: '',
        routeName: '',
        component: '',
        routeMeta: { ...existingMeta, authMark: form.buttonPermission.trim() },
        permissionCode: buildButtonPermissionCode(),
        sort: form.sort,
        enabled: form.enabled
      }
    }

    const menuName =
      form.menuName === displayedMenuName && originalMenuName
        ? originalMenuName
        : form.menuName.trim()
    return {
      menuId: form.menuId,
      parentId: form.parentId,
      menuName,
      menuType: form.storedMenuType === 'directory' ? 'directory' : 'menu',
      icon: form.icon.trim(),
      route: form.route.trim(),
      routeName: form.routeName.trim(),
      component: form.component.trim(),
      permissionCode: form.permissionCode.trim(),
      sort: form.sort,
      enabled: form.enabled,
      routeMeta: {
        ...existingMeta,
        roles: [...form.roles],
        link: form.link.trim(),
        showTextBadge: form.textBadge.trim(),
        activePath: form.activePath.trim(),
        keepAlive: form.keepAlive,
        isHide: form.isHide,
        isIframe: form.isIframe,
        showBadge: form.showBadge,
        fixedTab: form.fixedTab,
        isHideTab: form.isHideTab,
        isFullPage: form.isFullPage
      }
    }
  }

  const resetForm = () => {
    Object.assign(form, initialForm())
    originalMenuName = ''
    displayedMenuName = ''
    originalParentId = null
    originalPermissionCode = ''
    originalButtonPermission = ''
    formRef.value?.clearValidate?.()
  }
  watch(
    () => props.visible,
    (visible) => {
      if (!visible) return
      loadFormData()
      nextTick(() => formRef.value?.clearValidate?.())
    }
  )
  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    emit('submit', buildPayload())
  }
  const handleCancel = () => {
    if (!props.loading) emit('update:visible', false)
  }
</script>
