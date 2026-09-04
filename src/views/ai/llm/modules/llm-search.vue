<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import type { LlmSearchParams } from '../types'

  interface Props {
    modelValue: LlmSearchParams
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: LlmSearchParams): void
    (e: 'search', params: LlmSearchParams): void
    (e: 'reset'): void
  }>()

  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const formItems = computed(() => [
    {
      label: '模型信息',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '请输入配置名称或 model', clearable: true }
    },
    {
      label: 'Base URL',
      key: 'baseUrl',
      type: 'input',
      props: { placeholder: '请输入 OpenAI Compatible 接口地址', clearable: true }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: [
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' }
        ]
      }
    }
  ])

  const handleReset = () => emit('reset')

  const handleSearch = async (params: LlmSearchParams) => {
    await searchBarRef.value?.validate()
    emit('search', params)
  }
</script>
