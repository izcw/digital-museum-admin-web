<template>
  <div class="page-content notice-manage">
    <header
      ><div><h1>通知管理</h1><p>创建并向学校管理员发布系统、公告、预警和内容更新通知。</p></div
      ><div
        ><ElButton @click="router.push({ name: 'NotificationInbox' })">我的收件箱</ElButton
        ><ElButton type="primary" @click="openCreate">新增通知</ElButton></div
      ></header
    >
    <ElRow :gutter="10" class="stats"
      ><ElCol v-for="item in stats" :key="item.label" :xs="12" :sm="12" :md="6" :lg="6" :xl="6"
        ><ArtStatsCard
          :title="String(item.value)"
          :description="item.label"
          :icon="item.icon"
          icon-style="bg-primary"
          :show-arrow="false" /></ElCol
    ></ElRow>
    <ElCard shadow="never"
      ><ElTabs v-model="statusTab" class="status-tabs"
        ><ElTabPane label="全部通知" name="all" /><ElTabPane label="草稿" name="draft" /><ElTabPane
          label="已发布"
          name="published" /><ElTabPane label="已撤回" name="withdrawn" /></ElTabs
      ><div class="filters"
        ><ElInput v-model="keyword" clearable placeholder="搜索通知标题或摘要" /><ElSelect
          v-model="type"
          clearable
          placeholder="通知类型"
          ><ElOption
            v-for="(item, key) in typeMeta"
            :key="key"
            :label="item.label"
            :value="key" /></ElSelect
        ><ElSelect v-model="status" clearable placeholder="发布状态"
          ><ElOption
            v-for="(item, key) in statusMeta"
            :key="key"
            :label="item.label"
            :value="key" /></ElSelect
      ></div>
      <ElTable :data="filtered"
        ><ElTableColumn prop="id" label="序号" width="70" /><ElTableColumn
          label="通知标题"
          min-width="230"
          ><template #default="{ row }"
            ><div class="title-cell"
              ><strong>{{ row.title }}</strong
              ><span>{{ row.summary }}</span></div
            ></template
          ></ElTableColumn
        ><ElTableColumn label="通知类型" width="110"
          ><template #default="{ row }"
            ><ElTag :type="getType(row.type).type">{{ getType(row.type).label }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn prop="scope" label="发送范围" min-width="150" /><ElTableColumn
          label="状态"
          width="100"
          ><template #default="{ row }"
            ><ElTag :type="getStatus(row.status).type" effect="plain">{{
              getStatus(row.status).label
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="阅读情况" min-width="150"
          ><template #default="{ row }"
            ><div v-if="row.status === 'published'" class="read-progress"
              ><span>{{ row.readers }} / {{ row.recipients }} 人</span
              ><ElProgress :percentage="readRate(row)" :show-text="false" :stroke-width="5" /></div
            ><span v-else>—</span></template
          ></ElTableColumn
        ><ElTableColumn prop="creator" label="创建人" width="120" /><ElTableColumn
          prop="publishTime"
          label="发布时间"
          width="170"
        /><ElTableColumn label="操作" width="220" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="view(row)">查看</ElButton
            ><ElButton link type="primary" @click="edit(row)">编辑</ElButton
            ><ElButton v-if="row.status === 'draft'" link type="success" @click="publish(row)"
              >发布</ElButton
            ><ElButton v-if="row.status === 'published'" link type="warning" @click="withdraw(row)"
              >撤回</ElButton
            ><ElButton link type="primary" @click="copy(row)">复制</ElButton></template
          ></ElTableColumn
        ></ElTable
      >
    </ElCard>
    <ElDialog v-model="dialog" :title="form.id ? '编辑通知' : '新增通知'" width="min(680px, 94vw)"
      ><ElForm label-position="top"
        ><ElFormItem label="通知标题" required
          ><ElInput v-model="form.title" maxlength="60" show-word-limit /></ElFormItem
        ><ElFormItem label="通知摘要" required
          ><ElInput v-model="form.summary" maxlength="100" show-word-limit /></ElFormItem
        ><ElRow :gutter="10"
          ><ElCol :span="12"
            ><ElFormItem label="通知类型"
              ><ElSelect v-model="form.type"
                ><ElOption
                  v-for="(item, key) in typeMeta"
                  :key="key"
                  :label="item.label"
                  :value="key" /></ElSelect></ElFormItem></ElCol
          ><ElCol :span="12"
            ><ElFormItem label="发送范围"
              ><ElSelect v-model="form.scope"
                ><ElOption label="全部学校" value="全部学校" /><ElOption
                  label="第一小学管理员"
                  value="第一小学管理员" /><ElOption
                  label="实验小学管理员"
                  value="实验小学管理员" /><ElOption
                  label="指定学校（6）"
                  value="指定学校（6）" /></ElSelect></ElFormItem></ElCol></ElRow
        ><ElFormItem label="通知内容" required
          ><ElInput v-model="form.content" type="textarea" :rows="6" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="dialog = false">取消</ElButton
        ><ElButton @click="save('draft')">保存草稿</ElButton
        ><ElButton type="primary" @click="save('published')">保存并发布</ElButton></template
      ></ElDialog
    >
    <ElDrawer v-model="drawer" title="通知详情" size="min(640px, 92vw)"
      ><template v-if="active"
        ><h2>{{ active.title }}</h2
        ><div class="meta"
          ><ElTag :type="getType(active.type).type">{{ getType(active.type).label }}</ElTag
          ><span>{{ active.scope }}</span
          ><span>{{ active.publishTime }}</span></div
        ><ElAlert :title="active.summary" type="info" :closable="false" /><p class="content">{{
          active.content
        }}</p></template
      ></ElDrawer
    >
  </div>
</template>
<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import {
    notices,
    typeMeta,
    statusMeta,
    type NoticeItem,
    type NoticeType,
    type NoticeStatus
  } from '../shared/store'
  defineOptions({ name: 'NotificationManage' })
  const router = useRouter()
  const keyword = ref(''),
    type = ref(''),
    status = ref(''),
    dialog = ref(false),
    drawer = ref(false),
    active = ref<NoticeItem>()
  const statusTab = ref('all')
  const form = reactive({
    id: 0,
    title: '',
    summary: '',
    content: '',
    type: 'system' as NoticeType,
    scope: '全部学校'
  })
  const filtered = computed(() =>
    notices.value.filter(
      (n) =>
        (!keyword.value || `${n.title}${n.summary}`.includes(keyword.value)) &&
        (statusTab.value === 'all' || n.status === statusTab.value) &&
        (!type.value || n.type === type.value) &&
        (!status.value || n.status === status.value)
    )
  )
  const stats = computed(() => [
    { label: '全部通知', value: notices.value.length, icon: 'ri:notification-3-line' },
    {
      label: '已发布',
      value: notices.value.filter((n) => n.status === 'published').length,
      icon: 'ri:send-plane-line'
    },
    {
      label: '草稿',
      value: notices.value.filter((n) => n.status === 'draft').length,
      icon: 'ri:draft-line'
    },
    {
      label: '今日已读',
      value: notices.value.reduce((s, n) => s + n.readers, 0),
      icon: 'ri:eye-line'
    }
  ])
  const getType = (v: NoticeType) => typeMeta[v]
  const getStatus = (v: NoticeStatus) => statusMeta[v]
  const readRate = (n: NoticeItem) =>
    n.recipients ? Math.round((n.readers / n.recipients) * 100) : 0
  function openCreate() {
    Object.assign(form, {
      id: 0,
      title: '',
      summary: '',
      content: '',
      type: 'system',
      scope: '全部学校'
    })
    dialog.value = true
  }
  function edit(n: NoticeItem) {
    Object.assign(form, n)
    dialog.value = true
  }
  function view(n: NoticeItem) {
    active.value = n
    drawer.value = true
  }
  function publish(n: NoticeItem) {
    n.status = 'published'
    n.publishTime = '2026-09-09 10:35:00'
    n.recipients = n.scope === '全部学校' ? 36 : 4
    ElMessage.success('通知已发布（演示）')
  }
  function withdraw(n: NoticeItem) {
    n.status = 'withdrawn'
    ElMessage.success('通知已撤回（演示）')
  }
  function copy(n: NoticeItem) {
    Object.assign(form, n, { id: 0, title: `${n.title}（副本）` })
    dialog.value = true
  }
  function save(target: NoticeStatus) {
    if (!form.title.trim() || !form.summary.trim() || !form.content.trim()) {
      ElMessage.warning('请填写标题、摘要和内容')
      return
    }
    const existing = notices.value.find((n) => n.id === form.id)
    const data = {
      ...form,
      status: target,
      recipients: target === 'published' ? (form.scope === '全部学校' ? 36 : 4) : 0,
      readers: 0,
      creator: '当前管理员',
      publishTime: target === 'published' ? '2026-09-09 10:35:00' : '—',
      updateTime: '2026-09-09 10:35:00',
      sender: '通知中心'
    }
    if (existing) Object.assign(existing, data)
    else notices.value.unshift({ ...data, id: Math.max(...notices.value.map((n) => n.id)) + 1 })
    dialog.value = false
    ElMessage.success(target === 'published' ? '通知已发布（演示）' : '草稿已保存')
  }
</script>
<style scoped lang="scss">
  .notice-manage {
    min-height: var(--art-full-height);
    padding: 20px;
  }

  header,
  .filters,
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    font-size: 22px;
  }

  header p,
  .title-cell span,
  .meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .stats {
    row-gap: 10px;
    margin: 20px 0;
  }

  .filters {
    justify-content: flex-start;
    margin-bottom: 16px;
  }

  .status-tabs :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }

  .read-progress span {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .filters .el-input {
    width: 280px;
  }

  .filters .el-select {
    width: 150px;
  }

  .title-cell strong,
  .title-cell span {
    display: block;
  }

  .title-cell span {
    margin-top: 5px;
  }

  .meta {
    justify-content: flex-start;
    margin: 12px 0 20px;
  }

  .content {
    padding: 16px;
    margin-top: 20px;
    line-height: 1.9;
    white-space: pre-wrap;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .el-select {
    width: 100%;
  }
</style>
