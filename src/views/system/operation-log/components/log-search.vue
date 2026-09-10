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
  type SearchForm = Api.SystemManage.OperationLogSearchParams & { daterange?: string[] }

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
      placeholder: '日志编号或操作人员',
      clearable: true
    },
    {
      label: '系统模块',
      key: 'module',
      type: 'input',
      placeholder: '请输入系统模块',
      clearable: true
    },
    {
      label: '操作类型',
      key: 'operationType',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部类型',
        options: [
          { label: '查询', value: 'QUERY' },
          { label: '新增', value: 'CREATE' },
          { label: '修改', value: 'UPDATE' },
          { label: '删除', value: 'DELETE' },
          { label: '导出', value: 'EXPORT' },
          { label: '其他', value: 'OTHER' }
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
      label: '操作日期',
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
