<template>
  <section class="health-section">
    <ElRow :gutter="10" class="health-row">
      <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <ElCard shadow="never" class="health-panel">
          <div class="panel-title"
            ><div><h2>健康评分</h2><p>结合设备连接与资源占用，快速查看当前运行风险。</p></div
            ><ElTag :type="health.type">{{ health.label }}</ElTag></div
          >
          <ElRow :gutter="10" class="health-row">
            <ElCol :xs="24" :sm="8" :md="8" :lg="8" :xl="8"
              ><div class="score-block"
                ><ArtSvgIcon icon="ri:heart-pulse-line" /><strong>{{ health.score ?? '—' }}</strong
                ><p>综合评分 / 100</p
                ><ElProgress
                  v-if="health.score !== null"
                  :percentage="health.score"
                  :show-text="false"
                  :color="color"
                /><p>{{ health.score === null ? '数据不足，暂不评分' : health.label }}</p></div
              ></ElCol
            >
            <ElCol :xs="24" :sm="16" :md="16" :lg="16" :xl="16"
              ><ElDescriptions :column="1" border
                ><ElDescriptionsItem label="评分来源">{{
                  device.realDevice ? '待接入设备采集' : '前端演示规则'
                }}</ElDescriptionsItem
                ><ElDescriptionsItem label="资源异常">{{
                  health.issues === null ? '待评估' : `${health.issues} 项`
                }}</ElDescriptionsItem
                ><ElDescriptionsItem label="采集时间">{{
                  health.score === null ? '—' : '09-09 10:29:30（示例）'
                }}</ElDescriptionsItem></ElDescriptions
              ><p class="score-note">{{
                health.score === null
                  ? '离线、未激活或缺少监控数据时不生成当前评分。'
                  : health.issues
                    ? '建议查看资源占用中的异常指标，检查高负载或磁盘空间。'
                    : '当前示例资源占用正常，可继续关注运行趋势。'
              }}</p></ElCol
            >
          </ElRow>
          <div class="inspection-heading"
            ><h3>重点巡检</h3
            ><ElTag type="info" size="small">{{
              hasSnapshot ? '示例快照 · 独立于评分' : '待接入'
            }}</ElTag></div
          >
          <p class="score-note" v-if="device.state === 'offline' && hasSnapshot"
            >设备已离线，以下为最后一次示例记录。</p
          >
          <div v-for="item in inspections" :key="item.title" class="inspection-item">
            <ArtSvgIcon :icon="item.icon" />
            <div
              ><strong>{{ item.title }}</strong
              ><p>{{ hasSnapshot ? item.note : '等待设备采集与上报' }}</p></div
            >
            <ElTag :type="hasSnapshot ? item.type : 'info'" size="small">{{
              hasSnapshot ? item.status : '待上报'
            }}</ElTag>
          </div>
          <ElCollapse
            ><ElCollapseItem title="评分依据与范围" name="rules"
              ><p
                >示例基础分 100：CPU、内存、磁盘占用达到 80% 各扣 15 分，达到 90% 各扣 25
                分；同一指标只扣一次。90 分及以上为健康良好，70–89 分需关注，低于 70 分为风险。</p
              ><p
                >此评分仅反映连接和资源状态，不代表教学质量、AI 回答质量或 3D
                打印安全；这些模块需独立检查。</p
              ><div v-for="item in health.deductions" :key="item.name"
                >{{ item.name }}：{{
                  health.score === null ? '待评估' : `${item.value}% · 扣 ${item.deduction} 分`
                }}</div
              ></ElCollapseItem
            ></ElCollapse
          >
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"><slot name="machine" /></ElCol>
      <ElCol v-for="item in readiness" :key="item.title" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <ElCard shadow="never" class="readiness-card">
          <div class="inspection-heading"
            ><h3>{{ item.title }}</h3
            ><ArtSvgIcon :icon="item.icon"
          /></div>
          <strong class="readiness-value">{{ hasSnapshot ? item.value : '待上报' }}</strong>
          <p class="score-note">{{ hasSnapshot ? item.note : '等待设备上报监控数据' }}</p>
          <ElProgress
            v-if="hasSnapshot"
            :percentage="item.percent"
            :show-text="false"
            :status="item.percent < 100 ? 'warning' : 'success'"
          />
          <p class="score-note">{{ hasSnapshot ? item.detail : '暂无统计结果' }}</p>
        </ElCard>
      </ElCol>
    </ElRow>
  </section>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { getHealth, type HealthDevice } from './health-score'
  const props = defineProps<{
    device: HealthDevice & {
      name: string
      school: string
      version: string
      uptime: string
      ip: string
      location: string
    }
  }>()
  const health = computed(() => getHealth(props.device))
  const hasSnapshot = computed(() => !props.device.realDevice && props.device.state !== 'unknown')
  const inspections = [
    {
      title: '耗材与奖励库存',
      icon: 'ri:archive-line',
      status: '需补充',
      type: 'warning' as const,
      note: '备用 PLA 80 g；奖励 A3 剩余 4 件，A4 缺货。'
    },
    {
      title: '奖励任务核对',
      icon: 'ri:gift-line',
      status: '需核查',
      type: 'warning' as const,
      note: '1 项掉落确认超时；核查出货实物，避免重复发放。'
    },
    {
      title: '打印安全状态',
      icon: 'ri:shield-check-line',
      status: '已上报',
      type: 'success' as const,
      note: '机柜门关闭、联锁启用、急停未触发；保护由本地执行。'
    },
    {
      title: '维护记录',
      icon: 'ri:tools-line',
      status: '已记录',
      type: 'info' as const,
      note: '09-08 已清洁喷嘴与平台；烟雾检测模块未配置。'
    }
  ]
  const readiness = [
    {
      title: '打印完成质量',
      icon: 'ri:printer-line',
      value: `${Math.round((6 / 7) * 100)}%`,
      percent: (6 / 7) * 100,
      note: '今日示例 · 6 次完成 / 7 次已结束',
      detail: '失败 1 次；进行中的任务不计入。'
    },
    {
      title: '奖励任务完成度',
      icon: 'ri:gift-line',
      value: '16 / 18',
      percent: (16 / 18) * 100,
      note: '今日示例 · 已确认出货 / 扭蛋成功',
      detail: '排队 1 项，异常待核查 1 项。'
    },
    {
      title: '离线资源就绪',
      icon: 'ri:download-cloud-line',
      value: '2 / 3',
      percent: (2 / 3) * 100,
      note: '示例资源包 · 已就绪 / 总数',
      detail: '丝绸之路资源同步 72%，暂不可离线使用。'
    },
    {
      title: '交互外设就绪',
      icon: 'ri:device-line',
      value: '3 / 3',
      percent: 100,
      note: '示例状态 · 显示、触控、音频',
      detail: '显示已连接，触控响应正常，音频输出可用。'
    }
  ]
  const color = computed(() => `var(--el-color-${health.value.type})`)
</script>
<style scoped lang="scss">
  .readiness-card {
    height: 100%;
    border-radius: 10px;
  }

  .readiness-card .inspection-heading {
    margin-top: 0;
  }

  .readiness-value {
    font-size: 26px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .inspection-heading {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin: 22px 0 12px;
  }

  .inspection-heading h3 {
    margin: 0;
    font-size: 14px;
  }

  .inspection-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .inspection-item > div {
    flex: 1;
    min-width: 0;
  }

  .inspection-item strong {
    font-size: 13px;
    font-weight: 500;
  }

  .inspection-item p {
    margin: 5px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .health-section {
    margin-bottom: 24px;
  }

  .health-row {
    row-gap: 10px;
  }

  .health-panel {
    height: 100%;
    border-radius: 10px;
  }

  .panel-title {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .panel-title p,
  .score-block p,
  .score-note {
    margin: 8px 0;
    font-size: 12px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }

  .score-block,
  .environment-cell {
    padding: 16px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 8px;
  }

  .score-block > :first-child {
    font-size: 24px;
    color: var(--el-color-success);
  }

  .score-block strong {
    display: block;
    margin-top: 10px;
    font-size: 42px;
    font-weight: 500;
  }

  .environment-cell {
    height: 100%;
    overflow-wrap: anywhere;
  }

  .environment-cell span {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .environment-cell strong {
    font-size: 13px;
    font-weight: 600;
  }

  .el-collapse {
    margin-top: 16px;
  }
</style>
