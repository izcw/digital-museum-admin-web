<template>
  <div class="page-content inbox-page">
    <aside
      ><div class="aside-head"
        ><h1>通知收件箱</h1><p>查看当前账号收到的系统消息与提醒。</p
        ><ElInput v-model="keyword" clearable placeholder="搜索标题或摘要" /></div
      ><div class="counts"
        ><div
          ><span>全部通知</span><strong>{{ received.length }}</strong></div
        ><div
          ><span>未读消息</span><strong>{{ unreadCount }}</strong></div
        ></div
      ><div class="tabs"
        ><ElRadioGroup v-model="mode"
          ><ElRadioButton value="all">全部</ElRadioButton
          ><ElRadioButton value="unread">未读</ElRadioButton></ElRadioGroup
        ><ElButton link type="primary" @click="markAllRead">全部已读</ElButton></div
      ><div class="type-filter"
        ><ElSelect v-model="noticeType" clearable placeholder="全部通知类型"
          ><ElOption
            v-for="(item, key) in typeMeta"
            :key="key"
            :label="item.label"
            :value="key" /></ElSelect></div
      ><ElScrollbar class="message-scroll"
        ><button
          v-for="item in filtered"
          :key="item.id"
          class="message"
          :class="{ active: active?.id === item.id, unread: item.unread }"
          @click="select(item)"
          ><div
            ><strong>{{ item.title }}</strong
            ><i v-if="item.unread"></i></div
          ><p>{{ item.summary }}</p
          ><footer
            ><ElTag :type="getType(item.type).type" size="small">{{
              getType(item.type).label
            }}</ElTag
            ><span>{{ item.publishTime }}</span></footer
          ></button
        ><ElEmpty v-if="!filtered.length" description="暂无通知" :image-size="60" /></ElScrollbar
    ></aside>
    <main v-if="active"
      ><header
        ><div
          ><h2>{{ active.title }}</h2
          ><p>{{ active.summary }}</p></div
        ><div class="detail-actions"
          ><ElButton @click="toggleUnread">{{ active.unread ? '标为已读' : '标为未读' }}</ElButton
          ><ElButton @click="router.push({ name: 'NotificationManage' })"
            >进入通知管理</ElButton
          ></div
        ></header
      ><ElRow :gutter="10" class="info-row"
        ><ElCol
          v-for="item in detailInfo"
          :key="item.label"
          :xs="24"
          :sm="12"
          :md="6"
          :lg="6"
          :xl="6"
          ><div class="info-cell"
            ><span>{{ item.label }}</span
            ><strong>{{ item.value }}</strong></div
          ></ElCol
        ></ElRow
      ><div class="badges"
        ><ElTag :type="getType(active.type).type">{{ getType(active.type).label }}</ElTag
        ><ElTag type="info">收件箱通知</ElTag
        ><ElTag :type="active.unread ? 'warning' : 'info'">{{
          active.unread ? '未读' : '已读'
        }}</ElTag></div
      ><ElAlert :title="active.summary" type="info" :closable="false" /><article>{{
        active.content
      }}</article
      ><div class="article-actions"
        ><ElButton :disabled="activeIndex <= 0" @click="move(-1)">上一条</ElButton
        ><ElButton
          v-if="active.relatedRoute"
          type="primary"
          @click="router.push({ name: active.relatedRoute })"
          >查看相关业务</ElButton
        ><ElButton :disabled="activeIndex >= received.length - 1" @click="move(1)"
          >下一条</ElButton
        ></div
      ></main
    >
    <main v-else class="empty-detail"><ElEmpty description="请选择一条通知" /></main>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { notices, typeMeta, type NoticeItem, type NoticeType } from '../shared/store'
  defineOptions({ name: 'NotificationInbox' })
  const router = useRouter(),
    route = useRoute()
  const keyword = ref(''),
    mode = ref('all'),
    noticeType = ref('')
  const received = computed(() => notices.value.filter((n) => n.status === 'published'))
  const active = ref<NoticeItem>(received.value[0])
  const unreadCount = computed(() => received.value.filter((n) => n.unread).length)
  const filtered = computed(() =>
    received.value.filter(
      (n) =>
        (mode.value === 'all' || n.unread) &&
        (!noticeType.value || n.type === noticeType.value) &&
        (!keyword.value || `${n.title}${n.summary}`.includes(keyword.value))
    )
  )
  const getType = (v: NoticeType) => typeMeta[v]
  const activeIndex = computed(() =>
    received.value.findIndex((item) => item.id === active.value?.id)
  )
  const detailInfo = computed(() =>
    active.value
      ? [
          { label: '通知类型', value: getType(active.value.type).label },
          { label: '阅读状态', value: active.value.unread ? '未读' : '已读' },
          { label: '发送人', value: active.value.sender },
          { label: '发布时间', value: active.value.publishTime }
        ]
      : []
  )
  watch(
    () => route.query.noticeId,
    (id) => {
      const selected = received.value.find((item) => item.id === Number(id))
      if (selected) select(selected)
    },
    { immediate: true }
  )
  function select(item: NoticeItem) {
    active.value = item
    item.unread = false
  }
  function markAllRead() {
    received.value.forEach((n) => (n.unread = false))
    ElMessage.success('已将全部通知标记为已读')
  }
  function toggleUnread() {
    if (!active.value) return
    active.value.unread = !active.value.unread
  }
  function move(offset: number) {
    const next = received.value[activeIndex.value + offset]
    if (next) select(next)
  }
</script>
<style scoped lang="scss">
  .inbox-page {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    height: var(--art-full-height);
    padding: 0;
    overflow: hidden;
  }

  aside {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--el-border-color-light);
  }

  .aside-head {
    padding: 20px;
  }

  .aside-head h1 {
    font-size: 19px;
  }

  .aside-head p,
  main header p {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .aside-head .el-input {
    margin-top: 15px;
  }

  .counts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 0 20px;
  }

  .counts div,
  .info-cell {
    padding: 14px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .counts span,
  .info-cell span {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .counts strong {
    display: block;
    margin-top: 6px;
    font-size: 22px;
  }

  .tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .type-filter {
    padding: 0 20px 12px;
  }

  .type-filter .el-select {
    width: 100%;
  }

  .message-scroll {
    flex: 1;
    min-height: 0;
  }

  .message {
    display: block;
    width: calc(100% - 20px);
    padding: 14px;
    margin: 10px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
  }

  .message.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  .message > div {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .message i {
    width: 7px;
    height: 7px;
    background: var(--el-color-primary);
    border-radius: 50%;
  }

  .message p {
    margin: 7px 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  main {
    min-width: 0;
    padding: 24px;
    overflow: auto;
  }

  main header {
    display: flex;
    gap: 15px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .detail-actions,
  .article-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .article-actions {
    justify-content: flex-end;
    margin-top: 18px;
  }

  .info-row {
    row-gap: 10px;
    margin: 20px 0;
  }

  .info-cell strong {
    display: block;
    margin-top: 7px;
    font-size: 13px;
  }

  .badges {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  article {
    padding: 18px;
    margin-top: 16px;
    line-height: 1.9;
    white-space: pre-wrap;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
  }

  .empty-detail {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (width <= 800px) {
    .inbox-page {
      grid-template-columns: 1fr;
      height: auto;
    }

    .message-scroll {
      max-height: 420px;
    }

    main {
      border-top: 1px solid var(--el-border-color-light);
    }
  }
</style>
