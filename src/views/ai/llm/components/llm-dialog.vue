<template>
  <ElDialog
    v-model="dialogVisible"
    :title="type === 'add' ? '新增模型' : '编辑模型'"
    width="min(860px, 94vw)"
    :close-on-click-modal="false"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="140px">
      <ElFormItem label="配置名称" prop="name"
        ><ElInput v-model="formData.name" maxlength="60"
      /></ElFormItem>
      <ElFormItem label="模型用途"
        ><ElRadioGroup v-model="formData.purpose"
          ><ElRadioButton value="chat">对话</ElRadioButton
          ><ElRadioButton value="embedding">向量化</ElRadioButton></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem label="连接方式"
        ><ElSelect v-model="formData.provider"
          ><ElOption label="OpenAI Compatible" value="OpenAI Compatible" /><ElOption
            label="本地模型服务"
            value="本地模型服务" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="模型标识" prop="model"
        ><ElInput v-model="formData.model" placeholder="服务提供方的模型标识"
      /></ElFormItem>
      <ElFormItem label="服务地址" prop="baseUrl"
        ><ElInput v-model="formData.baseUrl" placeholder="https://example.com/v1"
      /></ElFormItem>
      <ElFormItem label="API Key" prop="apiKey"
        ><ElInput
          v-model="formData.apiKey"
          type="password"
          autocomplete="new-password"
          :placeholder="modelData?.apiKeyConfigured ? '留空保留已配置状态' : '请输入凭据'"
        /><small>前端预览不保存密钥到浏览器存储，也不向模型服务发送请求。</small></ElFormItem
      >
      <ElCollapse
        ><ElCollapseItem title="高级调用设置" name="advanced"
          ><ElFormItem v-if="formData.purpose === 'chat'" label="最大输出 Token"
            ><ElInputNumber v-model="formData.maxTokens" :min="1" :max="200000" /></ElFormItem
          ><ElFormItem v-if="formData.purpose === 'chat'" label="Temperature"
            ><ElInputNumber
              v-model="formData.temperature"
              :min="0"
              :max="2"
              :step="0.1" /></ElFormItem
          ><ElFormItem v-if="formData.purpose === 'chat'" label="Top P"
            ><ElInputNumber v-model="formData.topP" :min="0" :max="1" :step="0.1" /></ElFormItem
          ><ElFormItem label="超时（秒）"
            ><ElInputNumber v-model="formData.timeout" :min="1" :max="600" /></ElFormItem
          ><ElFormItem v-if="formData.purpose === 'chat'" label="流式响应"
            ><ElSwitch v-model="formData.stream" /></ElFormItem></ElCollapseItem
      ></ElCollapse>
      <ElFormItem label="设为此用途默认"><ElSwitch v-model="formData.isDefault" /></ElFormItem
      ><ElFormItem label="可用状态"
        ><ElSwitch
          v-model="formData.status"
          active-value="enabled"
          inactive-value="disabled" /></ElFormItem
      ><ElFormItem label="备注"
        ><ElInput v-model="formData.remark" type="textarea" :rows="2"
      /></ElFormItem> </ElForm
    ><template #footer
      ><ElButton @click="dialogVisible = false">取消</ElButton
      ><ElButton type="primary" :loading="loading" @click="handleSubmit">保存</ElButton></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { type FormInstance, type FormRules } from 'element-plus'
  import type { LlmModel, LlmModelMutation } from '../types'

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    modelData?: Partial<LlmModel>
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), { loading: false })
  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'submit', payload: LlmModelMutation): void
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const createEmptyForm = (): LlmModelMutation => ({
    purpose: 'chat',
    provider: 'OpenAI Compatible',
    apiKeyConfigured: false,
    name: '',
    model: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 1,
    timeout: 60,
    stream: true,
    isDefault: false,
    status: 'enabled',
    remark: ''
  })

  const formRef = ref<FormInstance>()
  const formData = reactive<LlmModelMutation>(createEmptyForm())
  const rules: FormRules<LlmModelMutation> = {
    name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
    model: [{ required: true, message: '请输入 Model', trigger: 'blur' }],
    baseUrl: [
      { required: true, message: '请输入 Base URL', trigger: 'blur' },
      { type: 'url', message: '请输入正确的 URL', trigger: 'blur' }
    ],

    maxTokens: [{ required: true, message: '请输入 Max Tokens', trigger: 'change' }],
    timeout: [{ required: true, message: '请输入超时时间', trigger: 'change' }],
    temperature: [{ required: true, message: '请输入 Temperature', trigger: 'change' }],
    topP: [{ required: true, message: '请输入 Top P', trigger: 'change' }]
  }

  watch(
    () => [props.visible, props.type, props.modelData] as const,
    ([visible]) => {
      if (!visible) return
      const nextData =
        props.type === 'edit' && props.modelData ? props.modelData : createEmptyForm()
      Object.assign(formData, createEmptyForm(), nextData, { apiKey: '' })
      nextTick(() => formRef.value?.clearValidate())
    }
  )

  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    emit('submit', {
      ...formData,
      name: formData.name.trim(),
      model: formData.model.trim(),
      baseUrl: formData.baseUrl.trim().replace(/\/$/, ''),
      apiKey: (formData.apiKey || '').trim(),
      apiKeyConfigured: Boolean(formData.apiKey?.trim() || props.modelData?.apiKeyConfigured),
      remark: formData.remark.trim()
    })
  }
</script>

<style scoped lang="scss">
  .model-alert {
    margin-bottom: 20px;
  }

  :deep(input[type='password']::-ms-reveal),
  :deep(input[type='password']::-ms-clear) {
    display: none;
  }
</style>
