<template>
  <ElCard shadow="never" class="alert-overview">
    <div class="heading">
      <div><h3>待处理告警</h3><p>集中查看设备当前需要处理的运维事项。</p></div>
      <ElButton link type="primary" @click="emit('navigate', 'events')">查看全部事件</ElButton>
    </div>
    <ElRow :gutter="10" class="alert-row">
      <ElCol v-for="item in items" :key="item.label" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
        <button class="alert-card" @click="emit('navigate', item.tab)">
          <span>{{ item.label }}</span
          ><strong :class="item.tone">{{ available ? item.count : '—' }}</strong>
          <small>{{ available ? item.note : '等待设备告警上报' }}</small>
        </button>
      </ElCol>
    </ElRow>
  </ElCard>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'
  const { currentDevice: device } = storeToRefs(useDeviceMonitorStore())
  const emit = defineEmits<{ navigate: [tab: string] }>()
  const available = computed(() => device.value?.state !== 'unknown')
  const items = computed(() => [
    {
      label: '严重',
      count: device.value?.state === 'offline' ? 1 : 0,
      note: device.value?.state === 'offline' ? '设备连接已中断' : '暂无严重告警',
      tone: 'danger',
      tab: 'events'
    },
    {
      label: '警告',
      count: device.value?.realDevice
        ? device.value.issue
          ? 1
          : 0
        : 2 + (device.value?.issue ? 1 : 0),
      note:
        device.value?.issue ||
        (device.value?.realDevice ? '暂无资源告警' : '奖励库存与备用耗材需补充'),
      tone: 'warning',
      tab: 'hardware'
    },
    {
      label: '提醒',
      count: device.value?.realDevice ? 0 : 2,
      note: device.value?.realDevice ? '暂无设备提醒' : '烟雾模块未配置，打印机维护待复查',
      tone: 'info',
      tab: 'hardware'
    }
  ])
</script>
<style scoped lang="scss">
  .alert-overview {
    border-radius: 10px;
  }

  .heading {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0;
    font-size: 16px;
  }

  p {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .alert-row {
    row-gap: 10px;
  }

  .alert-card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 12px;
    width: 100%;
    padding: 14px 16px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 8px;
  }

  .alert-card strong {
    font-size: 22px;
  }

  .alert-card small {
    grid-column: 1 / -1;
    color: var(--el-text-color-secondary);
  }

  .danger {
    color: var(--el-color-danger);
  }

  .warning {
    color: var(--el-color-warning);
  }

  .info {
    color: var(--el-color-info);
  }
</style>
