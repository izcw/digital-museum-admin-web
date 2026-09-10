<template>
  <ElDialog
    v-model="dialogVisible"
    :title="type === 'add' ? '新增用户' : '编辑用户'"
    width="520px"
    align-center
    :close-on-click-modal="false"
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <ElFormItem label="用户名" prop="userName">
        <ElInput v-model="formData.userName" maxlength="32" placeholder="请输入用户名" />
      </ElFormItem>
      <ElFormItem label="邮箱" prop="userEmail">
        <ElInput v-model="formData.userEmail" maxlength="254" placeholder="请输入邮箱" />
      </ElFormItem>
      <ElFormItem label="密码" prop="password">
        <ElInput
          v-model="formData.password"
          type="password"
          show-password
          maxlength="128"
          autocomplete="new-password"
          :placeholder="type === 'add' ? '至少 8 位' : '不修改请留空'"
        />
      </ElFormItem>
      <ElFormItem label="昵称" prop="nickName">
        <ElInput v-model="formData.nickName" maxlength="20" placeholder="请输入昵称" />
      </ElFormItem>
      <ElFormItem label="手机号" prop="userPhone">
        <ElInput v-model="formData.userPhone" maxlength="11" placeholder="请输入 11 位手机号" />
      </ElFormItem>
      <ElFormItem label="性别" prop="userGender">
        <ElSelect v-model="formData.userGender" class="w-full">
          <ElOption label="未知" value="unknown" />
          <ElOption label="男" value="male" />
          <ElOption label="女" value="female" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status">
          <ElRadio value="enabled">启用</ElRadio>
          <ElRadio value="disabled">停用</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="角色" prop="userRoles">
        <ElSelect
          v-model="formData.userRoles"
          multiple
          clearable
          class="w-full"
          :loading="roleLoading"
          placeholder="请选择角色"
        >
          <ElOption
            v-for="role in roleList"
            :key="role.roleCode"
            :value="role.roleCode"
            :label="role.roleName"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton :disabled="loading" @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { fetchGetRoleList } from '@/api/system-manage'

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    userData?: Partial<Api.SystemManage.UserListItem>
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), { loading: false })
  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'submit', payload: Api.SystemManage.UserMutation): void
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const formRef = ref<FormInstance>()
  const roleList = ref<Api.SystemManage.RoleListItem[]>([])
  const roleLoading = ref(false)
  const formData = reactive<Api.SystemManage.UserMutation>({
    userName: '',
    userEmail: '',
    password: '',
    nickName: '',
    userPhone: '',
    userGender: 'unknown',
    status: 'enabled',
    userRoles: []
  })

  const rules = computed<FormRules>(() => ({
    userName: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 32, message: '用户名长度为 2 到 32 个字符', trigger: 'blur' }
    ],
    userEmail: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
    ],
    password:
      props.type === 'add'
        ? [
            { required: true, message: '请输入密码', trigger: 'blur' },
            { min: 8, max: 128, message: '密码长度为 8 到 128 个字符', trigger: 'blur' }
          ]
        : [{ min: 8, max: 128, message: '密码长度为 8 到 128 个字符', trigger: 'blur' }],
    userPhone: [{ pattern: /^$|^[0-9]{11}$/, message: '请输入 11 位手机号', trigger: 'blur' }]
  }))

  const initFormData = () => {
    const row = props.type === 'edit' ? props.userData : undefined
    Object.assign(formData, {
      userName: row?.userName ?? '',
      userEmail: row?.userEmail ?? '',
      password: '',
      nickName: row?.nickName ?? '',
      userPhone: row?.userPhone ?? '',
      userGender: (row?.userGender as Api.SystemManage.UserMutation['userGender']) ?? 'unknown',
      status: (row?.status as Api.SystemManage.UserMutation['status']) ?? 'enabled',
      userRoles: [...(row?.userRoles ?? [])]
    })
  }

  const loadRoles = async () => {
    roleLoading.value = true
    try {
      const response = await fetchGetRoleList({ current: 1, size: 100, enabled: true })
      roleList.value = response.records
    } catch {
      roleList.value = []
      ElMessage.error('角色列表加载失败')
    } finally {
      roleLoading.value = false
    }
  }

  watch(
    () => [props.visible, props.type, props.userData] as const,
    ([visible]) => {
      if (!visible) return
      initFormData()
      loadRoles()
      nextTick(() => formRef.value?.clearValidate())
    }
  )

  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    const payload = { ...formData, userRoles: [...formData.userRoles] }
    if (!payload.password) delete payload.password
    emit('submit', payload)
  }
</script>
