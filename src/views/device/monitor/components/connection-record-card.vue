<template>
  <ElCard shadow="never" class="detail-card">
    <template #header>
      <div class="heading">
        <div><h3>近 24 小时连接记录</h3><p>按小时统计 20 秒心跳完整率。</p></div>
        <ElTag :type="onlineHours === 24 ? 'success' : onlineHours ? 'warning' : 'info'">
          {{ onlineHours }}/24 小时有心跳
        </ElTag>
      </div>
    </template>
    <div class="connection-grid" aria-label="近24小时连接状态">
      <div v-for="hour in hours" :key="hour.time" class="hour">
        <span :class="hour.status" :title="`${hour.label} · 心跳完整率 ${hour.percent}%`" />
        <small>{{ hour.shortLabel }}</small>
      </div>
    </div>
    <div class="legend">
      <i class="normal" />正常 <i class="partial" />不完整 <i class="offline" />无心跳
    </div>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'

  const { connectionHistory, telemetryHistory } = storeToRefs(useDeviceMonitorStore())
  const mergedHistory = computed(() => {
    const rows = new Map(connectionHistory.value.map((row) => [Date.parse(row.minute), row]))
    for (const row of telemetryHistory.value) rows.set(Date.parse(row.minute), row)
    return [...rows.values()]
  })
  const hours = computed(() => {
    const now = new Date()
    const currentHour = new Date(now)
    currentHour.setMinutes(0, 0, 0)
    return Array.from({ length: 24 }, (_, index) => {
      const start = currentHour.getTime() - (23 - index) * 3600000
      const end = start + 3600000
      const count = mergedHistory.value
        .filter((row) => {
          const minute = Date.parse(row.minute)
          return minute >= start && minute < end
        })
        .reduce((sum, row) => sum + Math.min(3, row.heartbeatCount ?? (row.heartbeat ? 1 : 0)), 0)
      const expected = index === 23 ? Math.max(3, (now.getMinutes() + 1) * 3) : 180
      const percent = Math.min(100, Math.round((count / expected) * 100))
      return {
        time: new Date(start).toISOString(),
        label: new Date(start).toLocaleString(),
        shortLabel: index % 3 === 0 || index === 23 ? `${new Date(start).getHours()}:00` : '',
        percent,
        status: percent >= 80 ? 'normal' : percent > 0 ? 'partial' : 'offline'
      }
    })
  })
  const onlineHours = computed(() => hours.value.filter((hour) => hour.status !== 'offline').length)
</script>

<style scoped lang="scss">
  .detail-card {
    height: 100%;
    border-radius: 10px;
  }
  .heading,
  .legend {
    display: flex;
    align-items: center;
  }
  .heading {
    gap: 12px;
    justify-content: space-between;
  }
  h3 {
    margin: 0;
  }
  p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
  }
  .connection-grid {
    display: grid;
    grid-template-columns: repeat(24, minmax(8px, 1fr));
    gap: 5px;
  }
  .hour {
    min-width: 0;
    text-align: center;
  }
  .hour span {
    display: block;
    height: 52px;
    border-radius: 4px;
  }
  .hour small {
    display: block;
    min-height: 16px;
    margin-top: 5px;
    overflow: visible;
    font-size: 9px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
  .normal {
    background: var(--el-color-success);
  }
  .partial {
    background: var(--el-color-warning);
  }
  .offline {
    background: var(--el-fill-color-darker);
  }
  .legend {
    gap: 7px;
    margin-top: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .legend i {
    width: 9px;
    height: 9px;
    margin-left: 8px;
    border-radius: 2px;
  }
  @media (max-width: 768px) {
    .connection-grid {
      grid-template-columns: repeat(12, minmax(8px, 1fr));
      row-gap: 12px;
    }
  }
</style>
