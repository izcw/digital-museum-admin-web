<template>
  <ElCard shadow="never" class="heartbeat-card">
    <template #header>
      <div class="heading">
        <div><h3>设备心跳状态</h3><p>最近 30 分钟 · 每分钟一列 · 每列最多显示 5 次</p></div>
        <div class="summary">
          <ElTag :type="currentDevice?.state === 'online' ? 'success' : 'info'">{{
            currentDevice?.state === 'online' ? '当前在线' : '当前离线'
          }}</ElTag>
          <span>共收到 {{ totalCount }} 次</span>
        </div>
      </div>
    </template>
    <ElAlert v-if="historyError" :title="historyError" type="warning" :closable="false" />
    <div ref="scrollRef" class="heartbeat-scroll">
      <div class="heartbeat-columns" aria-label="最近30分钟心跳状态">
        <div
          v-for="column in columns"
          :key="column.minute"
          class="minute-column"
          :title="`${formatTime(column.minute)} · 收到 ${column.count} 次心跳${column.count > 5 ? '，图中显示 5 格' : ''}`"
        >
          <div class="stack">
            <i
              v-for="level in 5"
              :key="level"
              :class="{ received: level <= column.visibleCount }"
            />
          </div>
          <span>{{ formatTime(column.minute) }}</span>
        </div>
      </div>
    </div>
    <div class="legend"><i class="received" />收到心跳 <i />未收到心跳</div>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'
  import { heartbeatColumns } from '../telemetry-data'

  const { currentDevice, telemetryHistory, historyError } = storeToRefs(useDeviceMonitorStore())
  const columns = computed(() => heartbeatColumns(telemetryHistory.value, Date.now(), 30))
  const totalCount = computed(() => columns.value.reduce((sum, column) => sum + column.count, 0))
  const scrollRef = ref<HTMLElement>()
  const scrollToLatest = () =>
    nextTick(() => {
      const element = scrollRef.value
      if (element && element.scrollWidth > element.clientWidth)
        element.scrollLeft = element.scrollWidth - element.clientWidth
    })
  let resizeObserver: ResizeObserver | undefined
  onMounted(() => {
    scrollToLatest()
    if (typeof ResizeObserver !== 'undefined' && scrollRef.value) {
      resizeObserver = new ResizeObserver(scrollToLatest)
      resizeObserver.observe(scrollRef.value)
    }
  })
  watch(() => [columns.value.at(-1)?.minute, columns.value.at(-1)?.count], scrollToLatest)
  onUnmounted(() => resizeObserver?.disconnect())
  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
</script>

<style scoped lang="scss">
  .heartbeat-card {
    border-radius: 10px;
  }
  .heading,
  .summary,
  .legend {
    display: flex;
    align-items: center;
  }
  .heading {
    gap: 12px;
    justify-content: space-between;
  }
  .summary {
    gap: 12px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  p,
  .summary,
  .legend {
    color: var(--el-text-color-secondary);
  }
  p {
    margin: 6px 0 0;
    font-size: 12px;
  }
  .heartbeat-scroll {
    padding-bottom: 4px;
    overflow-x: auto;
  }
  .heartbeat-columns {
    display: grid;
    grid-template-columns: repeat(30, minmax(24px, 1fr));
    gap: 6px;
    min-width: 900px;
  }
  .minute-column {
    min-width: 0;
    text-align: center;
  }
  .stack {
    display: flex;
    flex-direction: column-reverse;
    gap: 4px;
    height: 76px;
  }
  .stack i {
    flex: 1;
    min-height: 9px;
    background: var(--el-fill-color-darker);
    border-radius: 3px;
    transition: background-color 0.2s ease;
  }
  .stack i.received,
  .legend i.received {
    background: var(--el-color-success);
  }
  .minute-column > span {
    display: block;
    margin-top: 7px;
    font-size: 9px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
  .legend {
    gap: 7px;
    margin-top: 12px;
    font-size: 12px;
  }
  .legend i {
    width: 9px;
    height: 9px;
    margin-left: 8px;
    background: var(--el-fill-color-darker);
    border-radius: 2px;
  }
  @media (max-width: 768px) {
    .heading,
    .summary {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
