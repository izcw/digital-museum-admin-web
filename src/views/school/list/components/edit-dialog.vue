<template>
  <ElDialog
    v-model="visible"
    :title="row ? '编辑学校' : '新增学校'"
    width="560px"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="!loading"
    :show-close="!loading"
    @closed="reset"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElFormItem label="学校名称" prop="name"
        ><ElInput v-model.trim="form.name" :maxlength="100" placeholder="请输入学校名称"
      /></ElFormItem>
      <ElFormItem label="学校编码" prop="code"
        ><ElInput v-model.trim="form.code" :maxlength="32" placeholder="请输入学校编码"
      /></ElFormItem>
      <ElFormItem label="所在地区" prop="region"
        ><ElInput v-model.trim="form.region" :maxlength="60" placeholder="请输入所在地区"
      /></ElFormItem>
      <ElFormItem label="学校地址" prop="address"
        ><ElInput v-model.trim="form.address" :maxlength="200" placeholder="请输入学校地址"
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
  import { type FormInstance, type FormRules } from 'element-plus'
  import { type School, type SchoolMutation } from '../../shared/school-data'
  const props = defineProps<{ row?: School; loading?: boolean }>()
  const visible = defineModel<boolean>('visible', { required: true })
  type Payload = SchoolMutation
  const emit = defineEmits<{ submit: [payload: Payload] }>()
  const formRef = ref<FormInstance>()
  const emptyForm = (): Payload => ({
    name: '',
    code: '',
    region: '',
    address: '',
    status: 'enabled',
    remark: ''
  })
  const form = reactive<Payload>(emptyForm())
  const rules: FormRules = {
    name: [{ required: true, whitespace: true, message: '请输入学校名称', trigger: 'blur' }],
    region: [{ required: true, whitespace: true, message: '请输入所在地区', trigger: 'blur' }],
    address: [{ required: true, whitespace: true, message: '请输入学校地址', trigger: 'blur' }],
    code: [
      { required: true, message: '请输入学校编码', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z0-9_-]{2,32}$/,
        message: '请输入 2–32 位字母、数字、下划线或短横线',
        trigger: 'blur'
      }
    ]
  }
  function reset() {
    Object.assign(form, emptyForm())
    formRef.value?.clearValidate()
  }
  watch(visible, (value) => {
    if (!value) return
    Object.assign(form, emptyForm())
    if (props.row) {
      // 只复制可编辑字段，避免把列表字段一起提交。
      for (const key of Object.keys(form) as (keyof Payload)[]) {
        Object.assign(form, { [key]: props.row[key] })
      }
    }
    nextTick(() => formRef.value?.clearValidate())
  })
  async function submit() {
    if (props.loading) return
    if (!(await formRef.value?.validate().catch(() => false))) return
    emit('submit', { ...form })
  }
</script>
