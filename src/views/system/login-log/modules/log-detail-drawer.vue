<template>
  <ElDrawer v-model="visible" title="登录日志详情" size="760px">
    <ElSkeleton v-if="loading" :rows="7" animated />
    <ElDescriptions v-else-if="data" :column="2" border>
      <ElDescriptionsItem label="访问编号">{{ data.logCode }}</ElDescriptionsItem>
      <ElDescriptionsItem label="访问事件">{{
        data.event === 'LOGIN' ? '登录' : '退出'
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="用户 ID">{{ data.userId ?? '-' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="用户名称">{{ data.username }}</ElDescriptionsItem>
      <ElDescriptionsItem label="设备类型">{{ data.deviceType }}</ElDescriptionsItem>
      <ElDescriptionsItem label="访问地址">{{ data.ipAddress }}</ElDescriptionsItem>
      <ElDescriptionsItem label="登录地点">{{ data.location }}</ElDescriptionsItem>
      <ElDescriptionsItem label="操作系统">{{ data.operatingSystem }}</ElDescriptionsItem>
      <ElDescriptionsItem label="浏览器">{{ data.browser }}</ElDescriptionsItem>
      <ElDescriptionsItem label="状态"
        ><ElTag :type="data.status === 'success' ? 'success' : 'danger'">{{
          data.status === 'success' ? '成功' : '失败'
        }}</ElTag></ElDescriptionsItem
      >
      <ElDescriptionsItem label="访问时间">{{ formatDateTime(data.loginTime) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="描述">{{ data.description || '-' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="User Agent" :span="2">{{
        data.userAgent || '-'
      }}</ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { formatDateTime } from '@/utils/date'
  const props = defineProps<{
    modelValue: boolean
    data?: Api.SystemManage.LoginLogItem
    loading?: boolean
  }>()
  const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
</script>
