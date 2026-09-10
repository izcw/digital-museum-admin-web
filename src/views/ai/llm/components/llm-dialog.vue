<template>
  <ElDialog
    v-model="dialogVisible"
    :title="type === 'add' ? '新增大模型' : '编辑大模型'"
    width="760px"
    align-center
    :close-on-click-modal="false"
    @closed="formRef?.resetFields()"
  >
    <ElAlert
      title="按 OpenAI Compatible API 规范配置，Base URL 通常以 /v1 结尾。"
      type="info"
      :closable="false"
      show-icon
      class="model-alert"
    />

    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="110px">
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="配置名称" prop="name">
            <ElInput v-model="formData.name" maxlength="60" placeholder="如 OpenAI GPT-4.1" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Model" prop="model">
            <ElInput v-model="formData.model" maxlength="100" placeholder="如 gpt-4.1" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElFormItem label="Base URL" prop="baseUrl">
            <ElInput
              v-model="formData.baseUrl"
              maxlength="255"
              placeholder="https://api.openai.com/v1"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElFormItem label="API Key" prop="apiKey">
            <ElInput
              v-model="formData.apiKey"
              type="password"
              maxlength="255"
              autocomplete="new-password"
              placeholder="请输入 API Key"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Max Tokens" prop="maxTokens">
            <ElInputNumber
              v-model="formData.maxTokens"
              :min="1"
              :max="200000"
              :step="1024"
              class="!w-full"
              controls-position="right"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="超时时间" prop="timeout">
            <ElInputNumber
              v-model="formData.timeout"
              :min="1"
              :max="600"
              class="!w-full"
              controls-position="right"
            >
              <template #suffix>秒</template>
            </ElInputNumber>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Temperature" prop="temperature">
            <ElInputNumber
              v-model="formData.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              :precision="1"
              class="!w-full"
              controls-position="right"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Top P" prop="topP">
            <ElInputNumber
              v-model="formData.topP"
              :min="0"
              :max="1"
              :step="0.1"
              :precision="1"
              class="!w-full"
              controls-position="right"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="8">
          <ElFormItem label="流式响应">
            <ElSwitch v-model="formData.stream" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="8">
          <ElFormItem label="默认模型">
            <ElSwitch v-model="formData.isDefault" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="8">
          <ElFormItem label="启用状态" prop="status">
            <ElSwitch v-model="formData.status" active-value="enabled" inactive-value="disabled" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElFormItem label="备注">
            <ElInput
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              maxlength="300"
              show-word-limit
              placeholder="请输入模型用途或其他说明"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>

    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">保存</ElButton>
    </template>
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
    apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
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
      Object.assign(formData, createEmptyForm(), nextData)
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
      apiKey: formData.apiKey.trim(),
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
