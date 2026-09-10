<template>
  <section>
    <ElAlert v-if="historyError" :title="historyError" type="warning" :closable="false" />
    <ElCard
      v-if="props.mode === 'all' || props.mode === 'trend'"
      shadow="never"
      class="telemetry-card"
    >
      <template #header>最近 30 分钟 CPU 趋势 · 分钟平均 / 峰值</template>
      <ArtLineChart
        v-if="telemetryHistory.length"
        :data="series"
        :x-axis-data="times"
        :loading="historyLoading"
        :show-legend="true"
        height="240px"
      />
      <ElEmpty v-else description="暂无趋势数据" :image-size="64" />
      <p>未采集的分钟显示为空；离线时保留最后一次数据。温度、GPU 和外设等待后续接入。</p>
    </ElCard>
    <ElCard
      v-if="props.mode === 'all' || props.mode === 'resources'"
      shadow="never"
      class="telemetry-card"
    >
      <template #header
        >资源指标 · {{ currentDevice?.telemetry ? '最后一次采集' : '等待首次上报' }}</template
      >
      <ElTable :data="rows" empty-text="暂无遥测数据">
        <ElTableColumn prop="label" label="指标" />
        <ElTableColumn prop="value" label="数值" />
        <ElTableColumn prop="status" label="采集状态" />
        <ElTableColumn prop="time" label="采集时间" min-width="180" />
      </ElTable>
    </ElCard>
  </section>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'
  import { metricValue, minuteTimeline } from '../telemetry-data'
  const props = withDefaults(
    defineProps<{
      mode?: 'all' | 'status' | 'resources' | 'trend'
    }>(),
    { mode: 'all' }
  )
  const monitorStore = useDeviceMonitorStore()
  const { currentDevice, telemetryHistory, historyError, historyLoading } =
    storeToRefs(monitorStore)
  const labels: Record<string, string> = {
    cpuPercent: '整机 CPU 使用率',
    memoryTotalBytes: '内存总量',
    memoryAvailableBytes: '内存可用量',
    diskTotalBytes: '系统盘总容量',
    diskAvailableBytes: '系统盘剩余',
    appDiskTotalBytes: '应用数据盘总容量',
    appDiskAvailableBytes: '应用数据盘剩余',
    systemUptimeSeconds: '系统运行时长',
    appUptimeSeconds: '应用运行时长',
    requestLatencyMs: '上次请求耗时',
    failureCount: '此前连续失败次数'
  }
  const rows = computed(() =>
    Object.entries(currentDevice.value?.telemetry?.report.metrics ?? {}).map(([key, metric]) => {
      const value = metricValue(currentDevice.value?.telemetry, key)
      return {
        label: labels[key] ?? key,
        value:
          value === null
            ? '—'
            : key.endsWith('Bytes')
              ? `${(value / 1024 ** 3).toFixed(1)} GiB`
              : `${value.toFixed(1)}${key.endsWith('Percent') ? '%' : key.endsWith('Seconds') ? ' 秒' : key.endsWith('Ms') ? ' ms' : ''}`,
        status:
          metric.status === 'ok'
            ? value === null
              ? '过期'
              : '有效'
            : metric.status === 'error'
              ? '采集失败'
              : '不支持',
        time: new Date(metric.sampledAt).toLocaleString()
      }
    })
  )
  const timeline = computed(() => minuteTimeline(telemetryHistory.value))
  const times = computed(() =>
    timeline.value.map((row) =>
      new Date(row.minute).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  )
  const series = computed(() => [
    {
      name: '平均 CPU %',
      data: timeline.value.map((row) => {
        const value = row.metrics.cpuPercent?.average
        return value === undefined ? null : Math.round(value * 10) / 10
      })
    },
    {
      name: '峰值 CPU %',
      data: timeline.value.map((row) => {
        const value = row.metrics.cpuPercent?.max
        return value === undefined ? null : Math.round(value * 10) / 10
      })
    }
  ])
</script>
<style scoped>
  .telemetry-card {
    height: 100%;
    border-radius: 10px;
  }
  p {
    margin-top: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
