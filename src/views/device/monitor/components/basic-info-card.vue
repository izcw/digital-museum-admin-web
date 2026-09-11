<template>
  <ElCard v-if="device" shadow="never" class="detail-card">
    <h3>基本信息</h3>
    <p>学校归属、连接状态与设备标识。</p>
    <ElRow :gutter="10" class="info-grid">
      <ElCol v-for="item in items" :key="item.label" :xs="24" :sm="12" :md="12" :lg="12">
        <div class="info-cell"
          ><span>{{ item.label }}</span
          ><strong>{{ item.value || '—' }}</strong></div
        >
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="12" :lg="12">
        <div class="info-cell">
          <span>设备标签</span>
          <div class="tags">
            <ElTag v-for="tag in device.tags" :key="tag" type="info">{{ tag }}</ElTag>
            <span v-if="!device.tags.length">暂无标签</span>
          </div>
        </div>
      </ElCol>
    </ElRow>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useDeviceMonitorStore } from '@/store/modules/device-monitor'

  const { currentDevice: device } = storeToRefs(useDeviceMonitorStore())
  const labels = { online: '在线', offline: '离线', unknown: '未激活' }
  const items = computed(() =>
    device.value
      ? [
          { label: '所属学校', value: device.value.school },
          { label: '连接状态', value: labels[device.value.state] },
          { label: '客户端版本', value: device.value.version },
          { label: 'IP 地址', value: device.value.ip },
          { label: 'GPU', value: device.value.gpuModel },
          { label: '运行时长', value: device.value.uptime },
          { label: '电源状态', value: device.value.powerState },
          { label: '离线原因', value: device.value.offlineReason },
          { label: '安装位置', value: device.value.location },
          { label: '最后心跳', value: device.value.heartbeat }
        ]
      : []
  )
</script>

<style scoped lang="scss">
  .detail-card {
    height: 100%;
    border-radius: 10px;
  }
  h3 {
    margin: 0;
  }
  p {
    margin: 6px 0 16px;
    color: var(--el-text-color-secondary);
  }
  .info-grid {
    row-gap: 10px;
  }
  .info-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 68px;
    padding: 12px;
    overflow-wrap: anywhere;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }
  .info-cell span {
    color: var(--el-text-color-secondary);
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
