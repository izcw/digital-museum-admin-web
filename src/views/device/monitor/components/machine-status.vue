<template>
  <ElCard shadow="never" class="machine-status">
    <template #header
      ><div class="heading"
        ><div><h3>一体机状态</h3><p>上方触控屏 · 左侧 3D 打印 · 右侧扭蛋奖励出货</p></div
        ><ElTag :type="device.state === 'online' ? 'success' : 'info'">{{
          statusLabel
        }}</ElTag></div
      ></template
    >
    <ElRow :gutter="10" class="machine-row">
      <ElCol :span="24">
        <div class="machine-stage" :class="{ 'is-offline': !poweredOn }">
          <div class="cabinet">
            <div class="brand">小小博物館 <span>移动文化智慧课堂</span></div>
            <button class="screen" @click="emit('navigate', 'hardware')">
              <div v-if="!screenAvailable" class="screen-offline"
                ><ArtSvgIcon icon="ri:shut-down-line" /><strong>{{ statusLabel }}</strong
                ><small>{{
                  device.state === 'offline' ? '设备当前处于离线状态' : '等待设备首次连接并上报'
                }}</small></div
              >
              <template v-else>
                <div class="screen-top"
                  ><span>{{ device.realDevice ? '设备资源遥测' : '55 英寸 · 16:9' }}</span
                  ><ElTag size="small" type="info">{{
                    device.realDevice ? '最新遥测' : value('示例快照')
                  }}</ElTag></div
                >
                <ElRow :gutter="10" class="screen-rings">
                  <ElCol v-for="metric in metrics" :key="metric.name" :span="6">
                    <div class="screen-metric">
                      <ElProgress
                        type="circle"
                        :width="82"
                        :stroke-width="7"
                        :percentage="snapshot ? (metric.value ?? 0) : 0"
                        :color="
                          metric.value !== null && metric.value >= 80
                            ? 'var(--el-color-warning)'
                            : 'var(--el-color-primary)'
                        "
                      >
                        <template #default
                          ><strong>{{
                            snapshot && metric.value !== null
                              ? `${metric.value.toFixed(1)}%`
                              : '待上报'
                          }}</strong></template
                        >
                      </ElProgress>
                      <span>{{ metric.name }}</span
                      ><small>{{
                        snapshot && metric.value !== null ? metric.detail : '等待采集'
                      }}</small>
                    </div>
                  </ElCol>
                  <ElCol :span="6"
                    ><div class="screen-metric runtime-metric"
                      ><strong>{{ snapshot ? device.uptime : '待上报' }}</strong
                      ><span>运行时间</span
                      ><small>{{
                        device.state === 'offline' ? '最后上报' : '系统运行时长'
                      }}</small></div
                    ></ElCol
                  >
                </ElRow>
                <small>查看硬件与网络 →</small>
              </template>
            </button>
            <ElRow :gutter="10" class="lower-machine">
              <ElCol :span="12"
                ><button class="printer" @click="emit('navigate', 'printing')"
                  ><span class="module-label">3D 打印机</span
                  ><ElTag size="small" :type="poweredOn ? 'primary' : 'info'">{{
                    moduleAvailable ? '打印中' : moduleStatusLabel
                  }}</ElTag>
                  <small>{{
                    moduleAvailable ? '当前任务进度 64% · 剩余 28 分钟' : '暂无实时打印状态'
                  }}</small>
                  <ElTag size="small" :type="moduleAvailable ? 'primary' : 'info'">{{
                    moduleAvailable ? '耗材剩余 700 g' : '数量待上报'
                  }}</ElTag
                  ><small>{{ moduleAvailable ? '在用 620 g · 备用 80 g' : '—' }}</small
                  ><small>{{ moduleAvailable ? '今日完成 6 件' : '—' }}</small></button
                ></ElCol
              >
              <ElCol :span="12"
                ><button class="dispenser" @click="emit('navigate', 'hardware')"
                  ><span class="module-label">扭蛋奖励机</span
                  ><ElTag size="small" :type="moduleAvailable ? 'warning' : 'info'">{{
                    moduleAvailable ? '剩余 42 / 80 件' : moduleStatusLabel
                  }}</ElTag
                  ><small>{{
                    moduleAvailable ? '今日出货 16 件 · A4 缺货' : '奖励库存待上报'
                  }}</small
                  ><small>奖励出货口 · 非付费</small></button
                ></ElCol
              >
            </ElRow>
            <div class="cabinet-base"></div><i class="wheel left"></i><i class="wheel right"></i>
          </div>
        </div>
      </ElCol>
      <ElCol :span="24">
        <ElAlert :title="notice" type="info" :closable="false" show-icon />
      </ElCol>
    </ElRow>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'
  const { currentDevice } = storeToRefs(useDeviceMonitorStore())
  const device = computed(() => currentDevice.value!)
  const metrics = computed(() => [
    { name: 'CPU', value: device.value.cpu, detail: '处理器使用率' },
    { name: '内存', value: device.value.memory, detail: '内存使用率' },
    { name: '磁盘', value: device.value.disk, detail: '磁盘使用率' }
  ])
  const emit = defineEmits<{ navigate: [tab: string] }>()
  const poweredOn = computed(() =>
    device.value.realDevice
      ? device.value.state === 'online'
      : device.value.powerState === '已开机' && device.value.state === 'online'
  )
  const moduleAvailable = computed(() => !device.value.realDevice && poweredOn.value)
  const screenAvailable = computed(() => device.value.state === 'online')
  const offlineLabel = computed(() => (device.value.powerState === '已关机' ? '未开机' : '未连接'))
  const moduleStatusLabel = computed(() =>
    device.value.realDevice ? '待上报' : offlineLabel.value
  )
  const statusLabel = computed(() =>
    device.value.realDevice
      ? device.value.state === 'online'
        ? '在线 · 遥测'
        : device.value.state === 'offline'
          ? '已离线'
          : '等待首次连接'
      : poweredOn.value
        ? '运行中 · 演示状态'
        : offlineLabel.value
  )
  const snapshot = computed(() =>
    device.value.realDevice ? screenAvailable.value : device.value.state !== 'unknown'
  )
  const value = (text: string) => (snapshot.value ? text : '待上报')
  const notice = computed(() =>
    device.value.realDevice
      ? device.value.state === 'online'
        ? 'CPU、内存、磁盘和运行时长来自设备最新遥测；3D 打印机与奖励机状态仍等待设备接入。'
        : device.value.state === 'offline'
          ? '设备已离线，资源指标不可作为当前状态；模块状态等待恢复连接。'
          : '设备尚未首次连接，所有状态等待上报。'
      : !snapshot.value
        ? '设备尚未上报模块状态，示意图仅展示硬件布局。'
        : device.value.state === 'offline'
          ? '设备已离线，以下为最后一次示例快照，不代表当前状态。'
          : '模拟设备状态，可点击机身模块查看对应监控；不执行硬件控制。'
  )
</script>

<style scoped lang="scss">
  .screen-metric {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    width: 100%;
    text-align: center;
  }

  .screen-rings {
    align-items: center;
    width: 100%;
    margin: auto 0;
  }

  .screen-metric :deep(.el-progress-circle) {
    width: min(82px, 16cqw) !important;
    height: min(82px, 16cqw) !important;
  }

  .screen-metric strong {
    font-size: clamp(9px, 3cqw, 14px) !important;
    max-width: 100%;
    white-space: nowrap;
  }

  .screen-metric > span,
  .screen-metric small {
    font-size: clamp(8px, 2.4cqw, 12px) !important;
  }

  .runtime-metric strong {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: min(82px, 16cqw);
    overflow-wrap: anywhere;
  }

  .screen-metric > span {
    font-size: 12px;
    font-weight: 600;
  }

  .machine-status {
    height: 100%;
    border-radius: 12px;
  }

  .heading {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }

  h3,
  h4 {
    margin: 0;
  }

  h3 {
    font-size: 16px;
  }

  h4 {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
  }

  p,
  small,
  .summary-footer {
    font-size: 12px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .heading p {
    margin: 6px 0 0;
  }

  .machine-row {
    row-gap: 20px;
    align-items: center;
  }

  .machine-stage {
    padding: 20px 12px 32px;
    background: var(--el-fill-color-light);
    border-radius: 12px;
  }

  .machine-stage.is-offline .screen,
  .machine-stage.is-offline .printer,
  .machine-stage.is-offline .dispenser {
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color);
    filter: grayscale(1);
    border-color: var(--el-border-color-light);
  }

  .screen-offline {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: var(--el-text-color-placeholder);
  }

  .screen-offline :deep(.art-svg-icon) {
    font-size: 34px;
  }

  .screen-offline strong {
    font-size: clamp(18px, 5cqw, 30px);
  }

  .cabinet {
    position: relative;
    max-width: 560px;
    padding: 16px;
    margin: auto;
    background: var(--el-bg-color);
    border: 2px solid var(--el-border-color);
    border-radius: 22px 22px 8px 8px;
    box-shadow: 0 10px 24px rgb(0 0 0 / 6%);
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
  }

  .brand span {
    font-size: 10px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  button {
    width: 100%;
    font: inherit;
    color: var(--el-text-color-primary);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  button:hover {
    border-color: var(--el-color-primary);
  }

  button:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }

  .screen {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    min-height: 0;
    aspect-ratio: 16 / 9;
    padding: 8px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    container-type: inline-size;
  }

  .screen-top {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 11px;
  }

  .screen > small {
    font-size: clamp(8px, 2.4cqw, 12px);
  }

  .screen > span {
    font-size: 11px;
  }

  .artifact {
    font-size: 54px;
    color: var(--el-color-primary);
  }

  .lower-machine {
    align-items: stretch;
    margin-top: 16px;
  }

  .printer,
  .dispenser {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    height: auto;
    min-height: 0;
    aspect-ratio: 1 / 1;
    padding: 10px 6px;
    overflow-y: auto;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .module-label {
    font-size: 12px;
    font-weight: 600;
  }

  .print-window {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90%;
    height: 80px;
    font-size: 36px;
    color: var(--el-color-primary);
    background: var(--el-fill-color);
    border: 2px solid var(--el-border-color);
  }

  .rail,
  .print-bed {
    position: absolute;
    right: 10%;
    left: 10%;
    height: 3px;
    background: var(--el-text-color-placeholder);
  }

  .rail {
    top: 10px;
  }

  .print-bed {
    bottom: 8px;
  }

  .outlet {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70px;
    height: 70px;
    font-size: 28px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-8);
    border: 7px solid var(--el-border-color);
    border-radius: 50%;
  }

  .dispenser small {
    font-size: 10px;
  }

  .cabinet-base {
    height: 10px;
    margin: 14px -16px -16px;
    background: var(--el-border-color);
    border-radius: 0 0 6px 6px;
  }

  .wheel {
    position: absolute;
    bottom: -14px;
    width: 18px;
    height: 14px;
    background: var(--el-text-color-placeholder);
    border-radius: 3px 3px 6px 6px;
  }

  .left {
    left: 16px;
  }

  .right {
    right: 16px;
  }

  .module-summary {
    padding: 16px;
    margin-top: 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
  }

  .summary-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }
</style>
