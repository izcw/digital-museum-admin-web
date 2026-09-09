<template>
  <div
    v-show="visible"
    class="art-notification-panel art-card-sm !shadow-xl"
    :style="{ transform: show ? 'scaleY(1)' : 'scaleY(0.9)', opacity: show ? 1 : 0 }"
    @click.stop
  >
    <div class="panel-head"
      ><div
        ><strong>通知中心</strong><span>{{ unreadCount }} 条未读</span></div
      ><ElButton link type="primary" :disabled="!unreadCount" @click="markAllRead"
        >全部已读</ElButton
      ></div
    >
    <div class="notice-tabs"
      ><button :class="{ active: mode === 'all' }" @click="mode = 'all'"
        >全部（{{ received.length }}）</button
      ><button :class="{ active: mode === 'unread' }" @click="mode = 'unread'"
        >未读（{{ unreadCount }}）</button
      ></div
    >
    <ElScrollbar class="notice-scroll">
      <button v-for="item in displayed" :key="item.id" class="notice-item" @click="openNotice(item)"
        ><span class="notice-icon" :class="`type-${item.type}`"
          ><ArtSvgIcon :icon="iconMap[item.type]" /></span
        ><span class="notice-copy"
          ><strong>{{ item.title }}<i v-if="item.unread"></i></strong
          ><small>{{ item.summary }}</small
          ><time
            ><ElTag :type="typeMeta[item.type].type" size="small">{{
              typeMeta[item.type].label
            }}</ElTag
            >{{ item.publishTime }}</time
          ></span
        ></button
      >
      <ElEmpty v-if="!displayed.length" description="暂无通知" :image-size="64" />
    </ElScrollbar>
    <footer
      ><ElButton @click="goManage">通知管理</ElButton
      ><ElButton type="primary" @click="goInbox">查看全部通知</ElButton></footer
    >
  </div>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import {
    notices,
    typeMeta,
    type NoticeItem,
    type NoticeType
  } from '@/views/notification/shared/store'
  defineOptions({ name: 'ArtNotification' })
  const props = defineProps<{ value: boolean }>(),
    emit = defineEmits<{ 'update:value': [value: boolean] }>()
  const router = useRouter(),
    show = ref(false),
    visible = ref(false),
    mode = ref<'all' | 'unread'>('all')
  const received = computed(() => notices.value.filter((item) => item.status === 'published'))
  const unreadCount = computed(() => received.value.filter((item) => item.unread).length)
  const displayed = computed(() =>
    received.value.filter((item) => mode.value === 'all' || item.unread).slice(0, 8)
  )
  const iconMap: Record<NoticeType, string> = {
    system: 'ri:notification-3-line',
    announcement: 'ri:megaphone-line',
    warning: 'ri:alarm-warning-line',
    update: 'ri:download-cloud-line'
  }
  function close() {
    emit('update:value', false)
  }
  function openNotice(item: NoticeItem) {
    item.unread = false
    close()
    void router.push({ name: 'NotificationInbox', query: { noticeId: String(item.id) } })
  }
  function markAllRead() {
    received.value.forEach((item) => {
      item.unread = false
    })
    ElMessage.success('已将全部通知标记为已读')
  }
  function goInbox() {
    close()
    void router.push({ name: 'NotificationInbox' })
  }
  function goManage() {
    close()
    void router.push({ name: 'NotificationManage' })
  }
  watch(
    () => props.value,
    (open) => {
      if (open) {
        visible.value = true
        setTimeout(() => {
          show.value = true
        }, 5)
      } else {
        show.value = false
        setTimeout(() => {
          visible.value = false
        }, 300)
      }
    }
  )
</script>
<style scoped lang="scss">
  .art-notification-panel {
    position: absolute;
    top: 58px;
    right: 20px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    width: 390px;
    height: 540px;
    overflow: hidden;
    transition: all 0.3s;
    transform-origin: top;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

  .panel-head > div {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .panel-head span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .notice-tabs {
    display: flex;
    gap: 22px;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .notice-tabs button {
    padding: 0 0 12px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: none;
    border: 0;
  }

  .notice-tabs button.active {
    color: var(--el-color-primary);
    border-bottom: 2px solid var(--el-color-primary);
  }

  .notice-scroll {
    flex: 1;
    min-height: 0;
  }

  .notice-item {
    display: flex;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
  }

  .notice-item:hover {
    background: var(--el-fill-color-light);
  }

  .notice-icon {
    display: flex;
    flex: 0 0 38px;
    align-items: center;
    justify-content: center;
    height: 38px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 9px;
  }

  .type-warning {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  .type-update {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }

  .type-announcement {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  .notice-copy {
    flex: 1;
    min-width: 0;
  }

  .notice-copy > strong {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
  }

  .notice-copy i {
    width: 7px;
    height: 7px;
    background: var(--el-color-danger);
    border-radius: 50%;
  }

  .notice-copy > small {
    display: block;
    margin: 6px 0;
    overflow: hidden;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notice-copy time {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    font-size: 10px;
    color: var(--el-text-color-placeholder);
  }

  footer {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 10px;
    padding: 12px 16px;
    border-top: 1px solid var(--el-border-color-light);
  }

  footer .el-button {
    width: 100%;
    margin: 0;
  }

  @media (width <= 640px) {
    .art-notification-panel {
      top: 65px;
      right: 0;
      width: 100%;
      height: 80vh;
    }
  }
</style>
