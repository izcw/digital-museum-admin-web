<template>
  <ElDrawer v-model="visible" title="操作日志详情" size="760px">
    <ElSkeleton v-if="loading" :rows="8" animated />
    <template v-else-if="data">
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="日志编号">{{ data.logCode }}</ElDescriptionsItem>
        <ElDescriptionsItem label="系统模块">{{ data.module }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作类型"
          ><ElTag type="info">{{ data.operationType }}</ElTag></ElDescriptionsItem
        >
        <ElDescriptionsItem label="操作人员">{{ data.operatorName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="请求方式">{{ data.requestMethod }}</ElDescriptionsItem>
        <ElDescriptionsItem label="请求地址">{{ data.requestUrl }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作 IP">{{ data.ipAddress }}</ElDescriptionsItem>
        <ElDescriptionsItem label="响应码">{{ data.responseCode }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="data.status === 'success' ? 'success' : 'danger'">{{
            data.status === 'success' ? '成功' : '失败'
          }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="消耗时间">{{ data.durationMs }} 毫秒</ElDescriptionsItem>
        <ElDescriptionsItem label="操作时间">{{
          formatDateTime(data.operationTime)
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作描述">{{ data.description || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="data.errorMessage" label="错误信息" :span="2">{{
          data.errorMessage
        }}</ElDescriptionsItem>
      </ElDescriptions>
      <section class="parameter-section">
        <h3>请求参数</h3>
        <pre>{{ prettyJson(data.requestParams) }}</pre>
      </section>
      <section class="parameter-section">
        <h3>返回参数</h3>
        <pre>{{ prettyJson(data.responseParams) }}</pre>
      </section>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { formatDateTime } from '@/utils/date'
  const props = defineProps<{
    modelValue: boolean
    data?: Api.SystemManage.OperationLogItem
    loading?: boolean
  }>()
  const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const prettyJson = (value: unknown) =>
    value == null ? '-' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
</script>

<style scoped lang="scss">
  .parameter-section {
    margin-top: 24px;
  }

  .parameter-section h3 {
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 500;
  }

  .parameter-section pre {
    min-height: 90px;
    padding: 18px;
    overflow: auto;
    color: var(--art-gray-700);
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    background: var(--art-gray-100);
    border-radius: 10px;
  }
</style>
