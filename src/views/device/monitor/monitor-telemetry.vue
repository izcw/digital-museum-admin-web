<template>
  <section class="telemetry-panel">
    <div class="telemetry-heading"
      ><h3>运行监测</h3
      ><ElTag type="info" effect="plain">{{
        available ? '示例快照 · 09-09 10:30' : '等待监控数据'
      }}</ElTag></div
    >
    <p class="telemetry-note">{{
      device.realDevice
        ? '以下指标待接入设备上报后显示。'
        : device.state === 'offline'
          ? '离线设备仅展示最后一次上报的示例数据，不代表当前状态。'
          : '以下为界面演示指标。硬件温度、GPU 和外设状态需设备支持采集。'
    }}</p>
    <ElCard shadow="never" class="detail-section"
      ><h3>{{ device.state === 'offline' ? '最后上报的资源占用' : '资源占用' }}</h3
      ><p class="detail-subtitle">CPU、内存与磁盘的使用情况。</p
      ><ElRow :gutter="10" class="resource-grid"
        ><ElCol v-for="metric in metrics" :key="metric.key" :xs="24" :sm="8" :md="8" :lg="8" :xl="8"
          ><div class="resource-card"
            ><span class="muted">{{ metric.label }}</span
            ><strong>{{
              !available || device[metric.key] === null ? '—' : `${device[metric.key]}%`
            }}</strong
            ><ElProgress
              :percentage="available ? (device[metric.key] ?? 0) : 0"
              :show-text="false" /></div></ElCol></ElRow
    ></ElCard>
    <ElRow :gutter="10" class="telemetry-stats">
      <ElCol v-for="card in stats" :key="card.label" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <ArtStatsCard
          :title="available ? card.value : '—'"
          :description="card.label"
          :icon="card.icon"
          icon-style="bg-primary"
          :show-arrow="false"
        />
      </ElCol>
    </ElRow>
    <ElTabs v-model="activeTab" class="telemetry-tabs">
      <ElTabPane label="性能趋势" name="performance">
        <ElRow :gutter="10" class="chart-grid">
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>CPU / 内存使用率 <small>% · 最近 30 分钟</small></h4
              ><ArtLineChart
                v-if="available"
                :key="`resources-${device.id}`"
                :data="resourceSeries"
                :x-axis-data="times"
                :show-legend="true"
                height="220px" /><ElEmpty v-else description="暂无性能趋势" :image-size="64"
            /></div>
          </ElCol>
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>网络传输速率 <small>Mbps · 最近 30 分钟</small></h4
              ><ArtLineChart
                v-if="available"
                :key="`network-${device.id}`"
                :data="networkSeries"
                :x-axis-data="times"
                :show-legend="true"
                height="220px" /><ElEmpty v-else description="暂无网络趋势" :image-size="64"
            /></div>
          </ElCol>
        </ElRow>
      </ElTabPane>
      <ElTabPane label="网络与存储" name="network">
        <ElRow :gutter="10" class="chart-grid">
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>网络质量</h4
              ><ElDescriptions :column="2" border
                ><ElDescriptionsItem
                  v-for="item in networkItems"
                  :key="item.label"
                  :label="item.label"
                  >{{ display(item.value) }}</ElDescriptionsItem
                ></ElDescriptions
              ></div
            >
          </ElCol>
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>磁盘与缓存</h4
              ><ElDescriptions :column="2" border
                ><ElDescriptionsItem
                  v-for="item in storageItems"
                  :key="item.label"
                  :label="item.label"
                  >{{ display(item.value) }}</ElDescriptionsItem
                ></ElDescriptions
              ><div class="storage-progress"
                ><span>系统盘使用率</span
                ><ElProgress
                  v-if="available"
                  :percentage="device.disk ?? 0"
                  :status="(device.disk ?? 0) >= 90 ? 'exception' : undefined"
                /><span v-else>—</span></div
              ></div
            >
          </ElCol>
        </ElRow>
      </ElTabPane>
      <ElTabPane label="客户端与外设" name="client">
        <ElRow :gutter="10" class="chart-grid">
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>客户端运行</h4
              ><ElDescriptions :column="2" border
                ><ElDescriptionsItem
                  v-for="item in clientItems"
                  :key="item.label"
                  :label="item.label"
                  >{{ display(item.value) }}</ElDescriptionsItem
                ></ElDescriptions
              ></div
            >
          </ElCol>
          <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <div class="telemetry-box"
              ><h4>硬件与外设 <small>需设备支持</small></h4
              ><ElDescriptions :column="2" border
                ><ElDescriptionsItem
                  v-for="item in hardwareItems"
                  :key="item.label"
                  :label="item.label"
                  >{{ display(item.value) }}</ElDescriptionsItem
                ></ElDescriptions
              ></div
            >
          </ElCol>
        </ElRow>
      </ElTabPane>
    </ElTabs>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'

  const props = defineProps<{
    device: {
      id: number
      realDevice?: boolean
      state: string
      cpu: number | null
      memory: number | null
      disk: number | null
    }
  }>()
  const activeTab = ref('performance')
  watch(
    () => props.device,
    () => {
      activeTab.value = 'performance'
    }
  )
  const available = computed(() => !props.device.realDevice && props.device.state !== 'unknown')
  const freeDisk = computed(() => ((512 * (100 - (props.device.disk ?? 0))) / 100).toFixed(1))
  const stats = computed(() => [
    { label: '服务连接延迟', value: '28 ms', icon: 'ri:timer-line' },
    { label: '下载 / 上传速率', value: '8.4 / 1.2 Mbps', icon: 'ri:swap-line' },
    { label: '客户端内存占用', value: '486 MB', icon: 'ri:window-line' },
    { label: '系统盘剩余空间', value: `${freeDisk.value} GB`, icon: 'ri:hard-drive-3-line' }
  ])
  const metrics = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: '内存' },
    { key: 'disk', label: '磁盘' }
  ] as const
  const times = ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30']
  const resourceSeries = computed(() => [
    { name: 'CPU', data: [18, 26, 22, 41, 35, 29, props.device.cpu ?? 0] },
    { name: '内存', data: [32, 34, 39, 43, 40, 42, props.device.memory ?? 0] }
  ])
  const networkSeries = [
    { name: '下载', data: [2.1, 3.2, 7.6, 5.4, 4.2, 6.8, 8.4] },
    { name: '上传', data: [0.3, 0.5, 0.9, 0.6, 0.8, 1.1, 1.2] }
  ]
  const networkItems = [
    { label: '连接方式', value: '有线网络' },
    { label: '服务延迟', value: '28 ms' },
    { label: '丢包率', value: '0.2%' },
    { label: '网络抖动', value: '4 ms' },
    { label: '今日下载', value: '1.8 GB' },
    { label: '今日上传', value: '256 MB' },
    { label: '心跳间隔', value: '30 秒' },
    { label: '连续心跳丢失', value: '0 次' }
  ]
  const storageItems = computed(() => [
    { label: '系统盘容量', value: '512 GB' },
    { label: '剩余空间', value: `${freeDisk.value} GB` },
    { label: '磁盘读取', value: '12.6 MB/s' },
    { label: '磁盘写入', value: '3.2 MB/s' },
    { label: '素材缓存', value: '2.4 GB' },
    { label: '缓存同步', value: '已同步' }
  ])
  const clientItems = [
    { label: '主进程', value: '运行中' },
    { label: '页面响应', value: '正常' },
    { label: '进程 CPU', value: '8.2%' },
    { label: '进程内存', value: '486 MB' },
    { label: '内容播放', value: '播放中' },
    { label: '渲染帧率', value: '60 FPS' },
    { label: '今日异常退出', value: '0 次' },
    { label: '今日重启', value: '1 次' }
  ]
  const hardwareItems = [
    { label: 'CPU 温度', value: '52 ℃' },
    { label: 'GPU 占用', value: '16%' },
    { label: '供电方式', value: '交流电' },
    { label: '显示器', value: '已连接' },
    { label: '屏幕分辨率', value: '3840 × 2160' },
    { label: '触控设备', value: '已识别' },
    { label: '音频输出', value: '已识别' },
    { label: '摄像头', value: '未配置' }
  ]
  const display = (value: string) => (available.value ? value : '—')
</script>

<style scoped lang="scss">
  .detail-section {
    margin-bottom: 16px;
    border-radius: 10px;
  }

  .detail-subtitle {
    margin-bottom: 16px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .resource-grid {
    row-gap: 10px;
  }

  .resource-card {
    padding: 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .resource-card strong {
    display: block;
    margin: 12px 0;
    font-size: 24px;
  }

  .telemetry-panel {
    margin-bottom: 28px;
  }

  .telemetry-heading {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .telemetry-heading h3 {
    font-size: 15px;
    font-weight: 600;
  }

  .telemetry-note {
    margin: 8px 0 16px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .telemetry-stats {
    row-gap: 10px;
    margin-bottom: 16px;
  }

  .chart-grid {
    row-gap: 10px;
  }

  .telemetry-box {
    min-width: 0;
    height: 100%;
    padding: 16px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
  }

  h4 {
    margin-bottom: 14px;
    font-size: 14px;
    font-weight: 500;
  }

  h4 small {
    margin-left: 8px;
    font-size: 11px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  .storage-progress {
    margin-top: 16px;
    font-size: 12px;
  }

  .storage-progress > span {
    display: block;
    margin-bottom: 8px;
  }
</style>
