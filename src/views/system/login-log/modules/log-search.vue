<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="{}"
    @reset="emit('reset')"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  type SearchForm = Api.SystemManage.LoginLogSearchParams & { daterange?: string[] }
  const props = defineProps<{ modelValue: SearchForm }>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: SearchForm): void
    (e: 'search', value: SearchForm): void
    (e: 'reset'): void
  }>()
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const formItems = computed(() => [
    {
      label: '关键字',
      key: 'keyword',
      type: 'input',
      placeholder: '访问编号或用户名',
      clearable: true
    },
    {
      label: '访问事件',
      key: 'event',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部事件',
        options: [
          { label: '登录', value: 'LOGIN' },
          { label: '退出', value: 'LOGOUT' }
        ]
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部状态',
        options: [
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failure' }
        ]
      }
    },
    {
      label: '访问日期',
      key: 'daterange',
      type: 'datetime',
      props: {
        style: { width: '100%' },
        type: 'daterange',
        rangeSeparator: '至',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        valueFormat: 'YYYY-MM-DD'
      }
    }
  ])
  const handleSearch = async (value: SearchForm) => {
    await searchBarRef.value?.validate()
    emit('search', value)
  }
</script>
