<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增角色' : '编辑角色'"
    width="520px"
    align-center
    :close-on-click-modal="false"
    @close="resetForm"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElFormItem label="角色名称" prop="roleName">
        <ElInput v-model="form.roleName" maxlength="50" placeholder="请输入角色名称" />
      </ElFormItem>
      <ElFormItem label="角色编码" prop="roleCode">
        <ElInput v-model="form.roleCode" maxlength="50" placeholder="请输入角色编码" />
      </ElFormItem>
      <ElFormItem label="描述" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          maxlength="500"
          show-word-limit
          :rows="3"
          placeholder="请输入角色描述"
        />
      </ElFormItem>
      <ElFormItem label="启用">
        <ElSwitch v-model="form.enabled" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="saving" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { fetchCreateRole, fetchUpdateRole } from '@/api/system-manage'

  type RoleListItem = Api.SystemManage.RoleListItem

  const props = withDefaults(
    defineProps<{
      modelValue: boolean
      dialogType: 'add' | 'edit'
      roleData?: RoleListItem
    }>(),
    { modelValue: false, dialogType: 'add', roleData: undefined }
  )
  const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void
    (event: 'success'): void
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const formRef = ref<FormInstance>()
  const saving = ref(false)
  const form = reactive<Api.SystemManage.RoleMutation>({
    roleName: '',
    roleCode: '',
    description: '',
    enabled: true
  })
  const rules: FormRules = {
    roleName: [
      { required: true, message: '请输入角色名称', trigger: 'blur' },
      { min: 2, max: 50, message: '角色名称长度为 2 到 50 个字符', trigger: 'blur' }
    ],
    roleCode: [
      { required: true, message: '请输入角色编码', trigger: 'blur' },
      { min: 2, max: 50, message: '角色编码长度为 2 到 50 个字符', trigger: 'blur' }
    ]
  }

  const initForm = () => {
    const role = props.dialogType === 'edit' ? props.roleData : undefined
    Object.assign(form, {
      roleName: role?.roleName ?? '',
      roleCode: role?.roleCode ?? '',
      description: role?.description ?? '',
      enabled: role?.enabled ?? true
    })
    nextTick(() => formRef.value?.clearValidate())
  }
  watch(
    () => props.modelValue,
    (open) => open && initForm()
  )

  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    saving.value = true
    try {
      if (props.dialogType === 'add') await fetchCreateRole({ ...form })
      else await fetchUpdateRole(props.roleData!.roleId, { ...form })
      ElMessage.success(props.dialogType === 'add' ? '角色新增成功' : '角色修改成功')
      emit('success')
      visible.value = false
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '角色保存失败'))
    } finally {
      saving.value = false
    }
  }
  const resetForm = () => formRef.value?.resetFields()
  const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message
    return Array.isArray(message) ? message.join('；') : message || fallback
  }
</script>
