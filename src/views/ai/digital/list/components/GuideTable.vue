<template>
  <div class="guide-list art-full-height">
    <ArtSearchBar
      v-model="search"
      :items="searchItems"
      @search="applySearch"
      @reset="resetSearch"
    />
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" @refresh="refresh"
        ><template #left
          ><ElButton v-ripple @click="emit('add')">新增数字人</ElButton></template
        ></ArtTableHeader
      >
      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :pagination="pagination"
        row-key="id"
        empty-text="暂无匹配的数字人，请调整筛选或新增数字人"
        @pagination:size-change="changeSize"
        @pagination:current-change="changePage"
      >
        <template #identity="{ row }"
          ><div class="guide-identity"
            ><ElAvatar :src="row.avatar" :size="44" shape="square"
              ><span>{{ row.name.slice(0, 1) }}</span></ElAvatar
            ><div
              ><b>{{ row.name }}</b
              ><p :title="row.role">{{ row.role }}</p></div
            ></div
          ></template
        >
        <template #status="{ row }"
          ><ElTag :type="row.status === 'published' ? 'success' : 'info'">{{
            statusLabels[row.status]
          }}</ElTag
          ><div v-if="row.dirty" class="draft-note">草稿有更新</div></template
        >
        <template #version="{ row }"
          ><span>{{ row.version || '—' }}</span
          ><div class="draft-note">{{ row.publishedAt }}</div></template
        >
        <template #operation="{ row }"
          ><div class="flex items-center"
            ><ElButton
              v-for="action in actions"
              :key="action.key"
              link
              :type="action.key === 'remove' ? 'danger' : 'primary'"
              @click="operate(action.key, row.id)"
              >{{ action.label }}</ElButton
            ></div
          ></template
        >
      </ArtTable>
    </ElCard>
  </div>
</template>
<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useTableColumns } from '@/hooks/core/useTableColumns'

  interface Row {
    id: string
    name: string
    avatar?: string
    role: string
    voice: string
    scenes: string
    status: string
    scope: string
    version: string
    publishedAt: string
    dirty: boolean
  }
  const props = defineProps<{ rows: Row[] }>()
  const emit = defineEmits<{
    add: []
    edit: [id: string]
    configure: [id: string]
    publish: [id: string]
    remove: [id: string]
  }>()
  const statusLabels: Record<string, string> = {
    draft: '未发布',
    published: '已发布',
    withdrawn: '已撤回'
  }
  const search = ref({ keyword: '', status: '' }),
    applied = ref({ keyword: '', status: '' })
  const searchItems = [
    {
      key: 'keyword',
      label: '数字人',
      type: 'input',
      props: { placeholder: '名称、角色或音色', clearable: true }
    },
    {
      key: 'status',
      label: '发布状态',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部状态',
        options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
      }
    }
  ]
  const pagination = reactive({ current: 1, size: 20, total: 0 })
  const filtered = computed(() =>
    props.rows.filter(
      (r) =>
        (!applied.value.status || r.status === applied.value.status) &&
        `${r.name} ${r.role} ${r.voice}`
          .toLowerCase()
          .includes((applied.value.keyword || '').trim().toLowerCase())
    )
  )
  watch(
    filtered,
    (rows) => {
      pagination.total = rows.length
      pagination.current = Math.min(
        pagination.current,
        Math.max(1, Math.ceil(rows.length / pagination.size))
      )
    },
    { immediate: true }
  )
  const pagedRows = computed(() =>
    filtered.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  function applySearch() {
    applied.value = { ...search.value }
    pagination.current = 1
  }
  function resetSearch() {
    search.value = { keyword: '', status: '' }
    applySearch()
  }
  function refresh() {
    applySearch()
    ElMessage.success('已刷新当前浏览器中的数字人列表')
  }
  function changeSize(size: number) {
    pagination.size = size
    pagination.current = 1
  }
  function changePage(page: number) {
    pagination.current = page
  }
  const { columns, columnChecks } = useTableColumns<Row>(() => [
    { type: 'globalIndex', label: '序号', width: 70 },
    { prop: 'identity', label: '数字人', minWidth: 250, useSlot: true },
    { prop: 'voice', label: '音色', minWidth: 130 },
    { prop: 'scenes', label: '应用场景', minWidth: 190, showOverflowTooltip: true },
    { prop: 'status', label: '发布状态', width: 135, useSlot: true },
    { prop: 'scope', label: '学校开放范围', minWidth: 220, showOverflowTooltip: true },
    { prop: 'version', label: '最近发布', minWidth: 170, useSlot: true },
    { prop: 'operation', label: '操作', width: 280, fixed: 'right', useSlot: true }
  ])
  type Action = 'edit' | 'configure' | 'publish' | 'remove'
  const actions: { key: Action; label: string; type: 'edit' | 'view' | 'delete'; icon?: string }[] =
    [
      { key: 'edit', label: '编辑资料', type: 'edit' },
      { key: 'configure', label: '独立配置', type: 'view', icon: 'ri:settings-3-line' },
      { key: 'publish', label: '发布与版本', type: 'view', icon: 'ri:send-plane-line' },
      { key: 'remove', label: '删除', type: 'delete' }
    ]
  function operate(action: Action, id: string) {
    switch (action) {
      case 'edit':
        emit('edit', id)
        break
      case 'configure':
        emit('configure', id)
        break
      case 'publish':
        emit('publish', id)
        break
      case 'remove':
        emit('remove', id)
        break
    }
  }
</script>
<style scoped lang="scss">
  .guide-list {
    flex: 1;
    height: auto;
    min-height: 0;
    margin-top: 12px;
  }

  .art-table-card {
    min-height: 0;
  }

  .guide-identity {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .guide-identity .el-avatar {
    flex-shrink: 0;
  }

  .guide-identity p {
    max-width: 240px;
    margin: 4px 0 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .draft-note {
    margin-top: 5px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
