<template>
  <ElDialog
    v-model="visible"
    :title="row ? '编辑学校管理员' : '新增学校管理员'"
    width="560px"
    align-center
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!loading"
    :show-close="!loading"
    @closed="reset"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElFormItem label="所属学校" prop="schoolId">
        <ElSelect v-model="form.schoolId" filterable class="w-full" placeholder="请选择所属学校">
          <ElOption
            v-for="school in schools"
            :key="school.id"
            :label="school.name + (school.status === 'disabled' ? '（停用）' : '')"
            :value="school.id"
            :disabled="school.status === 'disabled' && school.id !== row?.schoolId"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="用户名" prop="userName"
        ><ElInput v-model.trim="form.userName" :maxlength="32" placeholder="请输入登录用户名"
      /></ElFormItem>
      <ElFormItem label="密码" prop="password">
        <ElInput
          v-model="form.password"
          type="password"
          show-password
          autocomplete="new-password"
          :maxlength="128"
          :placeholder="
            row ? '不修改请留空；填写新密码将使已有会话失效' : '请输入登录密码（至少 8 位）'
          "
        />
      </ElFormItem>
      <ElFormItem label="姓名" prop="name"
        ><ElInput v-model.trim="form.name" :maxlength="30" placeholder="请输入姓名"
      /></ElFormItem>

      <ElFormItem label="联系电话" prop="phone"
        ><ElInput v-model.trim="form.phone" :maxlength="25" placeholder="请输入联系电话"
      /></ElFormItem>
      <ElFormItem label="邮箱" prop="email"
        ><ElInput v-model.trim="form.email" :maxlength="254" placeholder="请输入邮箱"
      /></ElFormItem>
      <ElFormItem label="状态" prop="status"
        ><ElRadioGroup v-model="form.status"
          ><ElRadio value="enabled">启用</ElRadio
          ><ElRadio value="disabled">停用</ElRadio></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem label="备注" prop="remark"
        ><ElInput
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
          :maxlength="300"
          show-word-limit
          placeholder="请输入备注（选填）"
      /></ElFormItem>
    </ElForm>
    <template #footer
      ><ElButton :disabled="loading" @click="visible = false">取消</ElButton
      ><ElButton type="primary" :loading="loading" @click="submit">保存</ElButton></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import {
    schools,
    loadSchoolOptions,
    schoolError,
    type SchoolAdmin,
    type AdminMutation
  } from '../../shared/school-data'
  const props = defineProps<{ row?: SchoolAdmin; defaultSchoolId?: string; loading?: boolean }>()
  const visible = defineModel<boolean>('visible', { required: true })
  type Payload = AdminMutation
  const emit = defineEmits<{ submit: [payload: Payload] }>()
  const formRef = ref<FormInstance>()
  const emptyForm = (): Payload => ({
    schoolId: props.defaultSchoolId ?? '',
    userName: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    status: 'enabled',
    remark: ''
  })
  const form = reactive<Payload>(emptyForm())
  const rules = computed<FormRules>(() => ({
    password: [
      { required: !props.row, message: '请输入密码', trigger: 'blur' },
      { min: 8, max: 128, message: '密码长度为 8 到 128 个字符', trigger: 'blur' }
    ],
    schoolId: [{ required: true, message: '请选择所属学校', trigger: 'change' }],
    name: [{ required: true, whitespace: true, message: '请输入姓名', trigger: 'blur' }],
    userName: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z0-9_-]{2,32}$/,
        message: '请输入 2–32 位字母、数字、下划线或短横线',
        trigger: 'blur'
      }
    ],
    phone: [
      { required: true, message: '请输入联系电话', trigger: 'blur' },
      {
        pattern: /^\+?(?=(?:\D*\d){8,15}\D*$)[\d\s()-]{8,25}$/,
        message: '请输入有效联系电话，可包含区号',
        trigger: 'blur'
      }
    ],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
    ]
  }))
  function reset() {
    Object.assign(form, emptyForm())
    formRef.value?.clearValidate()
  }
  watch(visible, (value) => {
    if (!value) return
    loadSchoolOptions().catch((error) => ElMessage.error(schoolError(error, '学校选项加载失败')))
    Object.assign(form, emptyForm())
    if (props.row) {
      // 只复制可编辑字段，避免把列表字段一起提交。
      for (const key of Object.keys(form) as (keyof Payload)[]) {
        if (key !== 'password') Object.assign(form, { [key]: props.row[key] })
      }
    }
    nextTick(() => formRef.value?.clearValidate())
  })
  async function submit() {
    if (props.loading) return
    if (!(await formRef.value?.validate().catch(() => false))) return
    const payload = { ...form }
    if (!payload.password) delete payload.password
    emit('submit', payload)
  }
</script>
