<template>
  <div class="alert-page page-content">
    <header class="page-heading">
      <div
        ><div class="title-line"
          ><h1>告警与故障</h1><ElTag type="info" effect="plain">演示数据</ElTag></div
        ><p>集中处理一体机屏幕、客户端、网络、3D 打印机和奖励出货机异常。</p></div
      >
      <div class="header-actions"
        ><ElTag type="info" effect="plain"
          ><ArtSvgIcon icon="ri:time-line" />示例快照 · 09-09 10:30</ElTag
        ><ElButton @click="refresh"><ArtSvgIcon icon="ri:refresh-line" />刷新</ElButton></div
      >
    </header>

    <ElRow :gutter="10" class="summary-row">
      <ElCol v-for="item in summary" :key="item.label" :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <ArtStatsCard
          :title="String(item.value)"
          :description="item.label"
          :icon="item.icon"
          :icon-style="item.style"
          :show-arrow="false"
        />
      </ElCol>
    </ElRow>

    <ElAlert
      title="紧急故障：文化长廊终端已离线 25 分钟。打印机本地门禁、温控及急停保护仍由设备端独立执行。"
      type="error"
      :closable="false"
      show-icon
      class="urgent-alert"
    />

    <ElRow :gutter="10" class="charts-row">
      <ElCol :xs="24" :sm="24" :md="16" :lg="16" :xl="16"
        ><ElCard shadow="never" class="chart-card"
          ><div class="card-heading"
            ><div><h2>近 24 小时告警趋势</h2><p>按小时统计新产生的告警数量。</p></div
            ><ElTag type="info">示例</ElTag></div
          ><ArtLineChart
            :data="trendSeries"
            :x-axis-data="trendTimes"
            :show-legend="true"
            :smooth="false"
            height="280px" /></ElCard
      ></ElCol>
      <ElCol :xs="24" :sm="24" :md="8" :lg="8" :xl="8"
        ><ElCard shadow="never" class="chart-card"
          ><div class="card-heading"
            ><div><h2>告警来源分布</h2><p>当前筛选范围内的告警类型。</p></div></div
          ><ArtRingChart
            :data="sourceDistribution"
            :show-legend="true"
            legend-position="bottom"
            center-text="8 条"
            height="280px" /></ElCard
      ></ElCol>
    </ElRow>

    <ElCard shadow="never" class="list-card">
      <div class="card-heading"
        ><div><h2>告警记录</h2><p>离线、硬件安全与出货异常应优先处理。</p></div
        ><ElButton :disabled="!selectedIds.length" @click="batchAcknowledge"
          >批量确认（{{ selectedIds.length }}）</ElButton
        ></div
      >
      <ElRow :gutter="10" class="filters">
        <ElCol :xs="24" :sm="12" :md="6" :lg="6" :xl="6"
          ><ElInput v-model="filter.keyword" clearable placeholder="搜索设备、编号或故障内容"
        /></ElCol>
        <ElCol :xs="12" :sm="6" :md="4" :lg="4" :xl="4"
          ><ElSelect v-model="filter.severity" clearable placeholder="告警级别"
            ><ElOption label="严重" value="critical" /><ElOption
              label="警告"
              value="warning" /><ElOption label="提醒" value="info" /></ElSelect
        ></ElCol>
        <ElCol :xs="12" :sm="6" :md="4" :lg="4" :xl="4"
          ><ElSelect v-model="filter.source" clearable placeholder="告警来源"
            ><ElOption v-for="item in sources" :key="item" :label="item" :value="item" /></ElSelect
        ></ElCol>
        <ElCol :xs="12" :sm="6" :md="4" :lg="4" :xl="4"
          ><ElSelect v-model="filter.status" clearable placeholder="处理状态"
            ><ElOption label="待处理" value="pending" /><ElOption
              label="处理中"
              value="processing" /><ElOption label="已恢复" value="resolved" /></ElSelect
        ></ElCol>
        <ElCol :xs="12" :sm="6" :md="3" :lg="3" :xl="3"
          ><ElButton class="full-button" @click="resetFilters">重置</ElButton></ElCol
        >
      </ElRow>
      <ElTable
        :data="filteredAlerts"
        row-key="id"
        @selection-change="(rows) => (selectedIds = rows.map((row: AlertRecord) => row.id))"
      >
        <ElTableColumn type="selection" width="46" /><ElTableColumn
          prop="time"
          label="发生时间（示例）"
          width="170"
        />
        <ElTableColumn label="级别" width="90"
          ><template #default="{ row }"
            ><ElTag :type="getSeverity(row.severity).type">{{
              getSeverity(row.severity).label
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="设备" min-width="210"
          ><template #default="{ row }"
            ><div class="device-cell"
              ><strong>{{ row.device }}</strong
              ><span>{{ row.code }} · {{ row.school }}</span></div
            ></template
          ></ElTableColumn
        >
        <ElTableColumn prop="source" label="来源" width="130" /><ElTableColumn
          prop="title"
          label="告警与故障"
          min-width="240"
          show-overflow-tooltip
        />
        <ElTableColumn label="持续时间" width="110"
          ><template #default="{ row }">{{ row.duration }}</template></ElTableColumn
        >
        <ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag :type="getStatus(row.status).type" effect="plain">{{
              getStatus(row.status).label
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="190" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="openDetail(row)">查看详情</ElButton
            ><ElButton v-if="row.status === 'pending'" link type="primary" @click="acknowledge(row)"
              >确认</ElButton
            ><ElButton v-if="row.status !== 'resolved'" link type="success" @click="resolve(row)"
              >标记恢复</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>

    <ElDrawer v-model="drawerVisible" title="告警与故障详情" size="min(680px, 92vw)">
      <template v-if="activeAlert">
        <div class="drawer-title"
          ><div
            ><ElTag :type="severityMeta[activeAlert.severity].type">{{
              severityMeta[activeAlert.severity].label
            }}</ElTag
            ><h2>{{ activeAlert.title }}</h2></div
          ><ElTag :type="statusMeta[activeAlert.status].type" effect="plain">{{
            statusMeta[activeAlert.status].label
          }}</ElTag></div
        >
        <ElDescriptions :column="2" border
          ><ElDescriptionsItem label="告警编号">{{ activeAlert.id }}</ElDescriptionsItem
          ><ElDescriptionsItem label="来源">{{ activeAlert.source }}</ElDescriptionsItem
          ><ElDescriptionsItem label="设备">{{ activeAlert.device }}</ElDescriptionsItem
          ><ElDescriptionsItem label="设备编号">{{ activeAlert.code }}</ElDescriptionsItem
          ><ElDescriptionsItem label="所属学校" :span="2">{{
            activeAlert.school
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="发生时间">{{ activeAlert.time }}</ElDescriptionsItem
          ><ElDescriptionsItem label="最后上报">{{ activeAlert.lastReport }}</ElDescriptionsItem
          ><ElDescriptionsItem label="持续时间">{{ activeAlert.duration }}</ElDescriptionsItem
          ><ElDescriptionsItem label="数据状态">{{
            activeAlert.dataState
          }}</ElDescriptionsItem></ElDescriptions
        >
        <section class="drawer-section"
          ><h3>故障说明</h3><p>{{ activeAlert.description }}</p></section
        >
        <section class="drawer-section"
          ><h3>影响范围</h3
          ><ElAlert
            :title="activeAlert.impact"
            :type="activeAlert.severity === 'critical' ? 'error' : 'warning'"
            :closable="false"
            show-icon
        /></section>
        <section class="drawer-section"
          ><h3>建议排查步骤</h3
          ><ElSteps
            direction="vertical"
            :active="activeAlert.status === 'resolved' ? activeAlert.steps.length : 1"
            finish-status="success"
            ><ElStep v-for="step in activeAlert.steps" :key="step" :title="step" /></ElSteps
        ></section>
        <section class="drawer-section"
          ><h3>处理记录</h3
          ><ElTimeline
            ><ElTimelineItem
              v-for="log in activeAlert.logs"
              :key="log.time + log.text"
              :timestamp="log.time"
              :type="log.type"
              >{{ log.text }}</ElTimelineItem
            ></ElTimeline
          ></section
        >
      </template>
      <template #footer
        ><ElButton @click="drawerVisible = false">关闭</ElButton
        ><ElButton
          v-if="activeAlert?.status === 'pending'"
          type="primary"
          @click="acknowledge(activeAlert)"
          >确认告警</ElButton
        ><ElButton
          v-if="activeAlert && activeAlert.status !== 'resolved'"
          type="success"
          @click="resolve(activeAlert)"
          >标记已恢复</ElButton
        ></template
      >
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'
  import ArtRingChart from '@/components/core/charts/art-ring-chart/index.vue'

  defineOptions({ name: 'DeviceAlert' })
  type Severity = 'critical' | 'warning' | 'info'
  type Status = 'pending' | 'processing' | 'resolved'
  interface AlertRecord {
    id: string
    time: string
    severity: Severity
    status: Status
    device: string
    code: string
    school: string
    source: string
    title: string
    duration: string
    lastReport: string
    dataState: string
    description: string
    impact: string
    steps: string[]
    logs: {
      time: string
      text: string
      type: 'primary' | 'warning' | 'success' | 'danger' | 'info'
    }[]
  }
  const severityMeta = {
    critical: { label: '严重', type: 'danger' as const },
    warning: { label: '警告', type: 'warning' as const },
    info: { label: '提醒', type: 'info' as const }
  }
  const statusMeta = {
    pending: { label: '待处理', type: 'danger' as const },
    processing: { label: '处理中', type: 'warning' as const },
    resolved: { label: '已恢复', type: 'success' as const }
  }
  const getSeverity = (severity: Severity) => severityMeta[severity]
  const getStatus = (status: Status) => statusMeta[status]
  const commonLogs = [
    { time: '09-09 10:05:00', text: '设备上报告警（示例）', type: 'warning' as const }
  ]
  const alerts = ref<AlertRecord[]>([
    {
      id: 'ALERT-DEMO-001',
      time: '09-09 10:05:00',
      severity: 'critical',
      status: 'pending',
      device: '文化长廊展示终端',
      code: 'DEMO-004',
      school: '示例学校 · 实验小学',
      source: '设备连接',
      title: '设备主动关机，心跳已中断',
      duration: '25 分钟',
      lastReport: '09-09 10:05:00',
      dataState: '最后快照',
      description: '客户端最后一次上报电源状态为已关机，之后未再收到心跳。',
      impact: '屏幕、3D 打印机、奖励出货机及数字人服务当前不可用。',
      steps: [
        '确认校内供电和总电源开关',
        '检查一体机电源线及漏电保护装置',
        '开机后等待客户端恢复心跳',
        '确认屏幕、打印机和出货机重新上线'
      ],
      logs: commonLogs
    },
    {
      id: 'ALERT-DEMO-002',
      time: '09-09 10:18:12',
      severity: 'warning',
      status: 'processing',
      device: '一楼展厅互动终端',
      code: 'DEMO-001',
      school: '示例学校 · 第一小学',
      source: '奖励出货机',
      title: 'A4 货道缺货',
      duration: '12 分钟',
      lastReport: '09-09 10:30:00',
      dataState: '实时',
      description: 'A4 货道“迷你文物模型”库存为 0，系统已暂停向该货道分配奖励任务。',
      impact: 'A4 奖励暂不可发放，其他三个货道可继续出货。',
      steps: [
        '核对 A4 货道实物库存',
        '打开维护门并完成补货',
        '在本地确认补货数量',
        '执行一次测试出货并确认掉落'
      ],
      logs: [
        ...commonLogs,
        { time: '09-09 10:22:10', text: '学校管理员已确认，等待现场补货（示例）', type: 'primary' }
      ]
    },
    {
      id: 'ALERT-DEMO-003',
      time: '09-09 10:20:45',
      severity: 'warning',
      status: 'pending',
      device: '一楼展厅互动终端',
      code: 'DEMO-001',
      school: '示例学校 · 第一小学',
      source: '奖励出货机',
      title: '奖励掉落确认超时',
      duration: '9 分钟',
      lastReport: '09-09 10:29:58',
      dataState: '实时',
      description: '出货电机完成转动后，掉落传感器未在规定时间内确认奖励通过。',
      impact: '1 项奖励任务状态不确定，应核对实物后再决定是否重新出货。',
      steps: [
        '检查取货口是否已有奖励',
        '查看货道是否卡料',
        '清理后执行货道自检',
        '确认原任务结果，避免重复发放'
      ],
      logs: commonLogs
    },
    {
      id: 'ALERT-DEMO-004',
      time: '09-09 09:54:20',
      severity: 'warning',
      status: 'pending',
      device: '科学教室教学终端',
      code: 'DEMO-002',
      school: '示例学校 · 第一小学',
      source: '系统资源',
      title: 'CPU 持续高负载',
      duration: '36 分钟',
      lastReport: '09-09 10:30:00',
      dataState: '实时',
      description: 'CPU 使用率连续 10 分钟高于 80%，当前示例值为 88%。',
      impact: '数字人响应、触控动画和内容播放可能出现卡顿。',
      steps: [
        '查看占用最高的客户端进程',
        '检查是否存在多个内容渲染任务',
        '结束异常任务或重启客户端',
        '观察 10 分钟确认负载恢复'
      ],
      logs: commonLogs
    },
    {
      id: 'ALERT-DEMO-005',
      time: '09-09 09:40:00',
      severity: 'warning',
      status: 'pending',
      device: '图书馆导览终端',
      code: 'DEMO-003',
      school: '示例学校 · 实验小学',
      source: '系统资源',
      title: '系统盘剩余空间不足',
      duration: '50 分钟',
      lastReport: '09-09 10:30:00',
      dataState: '实时',
      description: '系统盘使用率为 92%，可用空间已低于正常运行建议值。',
      impact: '资源包下载、日志写入及客户端更新可能失败。',
      steps: [
        '检查资源缓存和临时文件',
        '清理已废弃的内容版本',
        '保留必要日志后清理过期日志',
        '确认磁盘使用率恢复'
      ],
      logs: commonLogs
    },
    {
      id: 'ALERT-DEMO-006',
      time: '09-09 08:35:00',
      severity: 'info',
      status: 'processing',
      device: '一楼展厅互动终端',
      code: 'DEMO-001',
      school: '示例学校 · 第一小学',
      source: '3D 打印机',
      title: '备用青铜色 PLA 余量偏低',
      duration: '1 小时 55 分',
      lastReport: '09-09 10:30:00',
      dataState: '实时',
      description: '备用青铜色 PLA 仅剩 80 g。当前打印任务使用米白色 PLA，不受影响。',
      impact: '后续需要青铜色耗材的打印任务可能无法开始。',
      steps: [
        '核对耗材架实物余量',
        '准备同规格 PLA 耗材',
        '更换后确认材料类型和数量',
        '执行进料检测'
      ],
      logs: commonLogs
    },
    {
      id: 'ALERT-DEMO-007',
      time: '09-08 15:10:00',
      severity: 'info',
      status: 'resolved',
      device: '一楼展厅互动终端',
      code: 'DEMO-001',
      school: '示例学校 · 第一小学',
      source: '3D 打印机',
      title: '打印任务首层附着异常',
      duration: '18 分钟',
      lastReport: '09-08 15:28:00',
      dataState: '历史',
      description: '首层检测判断模型附着不稳定，设备本地已停止加热并暂停任务。',
      impact: '该次打印未完成，未影响其他模块。',
      steps: [
        '等待喷嘴和热床降温',
        '清洁并重新调平打印平台',
        '检查模型首层参数',
        '重新打印并观察首层'
      ],
      logs: [
        ...commonLogs,
        { time: '09-08 15:28:00', text: '教师重新调平后打印恢复（示例）', type: 'success' }
      ]
    },
    {
      id: 'ALERT-DEMO-008',
      time: '09-08 11:20:00',
      severity: 'info',
      status: 'resolved',
      device: '创新空间试点终端',
      code: 'DEMO-005',
      school: '示例学校 · 第二小学',
      source: '触控屏幕',
      title: '触控设备短暂断开',
      duration: '2 分钟',
      lastReport: '09-08 11:22:00',
      dataState: '历史',
      description: '系统检测到 USB 触控设备短暂断开，随后自动重新识别。',
      impact: '断开期间无法进行触控操作，内容展示未中断。',
      steps: ['检查触控 USB 连接', '确认触控服务已重新识别', '执行多点触控测试'],
      logs: [
        ...commonLogs,
        { time: '09-08 11:22:00', text: '触控设备恢复并通过自检（示例）', type: 'success' }
      ]
    }
  ])
  const filter = reactive({ keyword: '', severity: '', source: '', status: '' })
  const sources = [
    '设备连接',
    '系统资源',
    '触控屏幕',
    '3D 打印机',
    '奖励出货机',
    'AI 数字人',
    '内容同步'
  ]
  const selectedIds = ref<string[]>([]),
    drawerVisible = ref(false),
    activeAlert = ref<AlertRecord>()
  const summary = computed(() => [
    {
      label: '待处理',
      value: alerts.value.filter((item) => item.status === 'pending').length,
      icon: 'ri:alarm-warning-line',
      style: 'bg-danger'
    },
    {
      label: '严重故障',
      value: alerts.value.filter(
        (item) => item.severity === 'critical' && item.status !== 'resolved'
      ).length,
      icon: 'ri:error-warning-line',
      style: 'bg-danger'
    },
    {
      label: '处理中',
      value: alerts.value.filter((item) => item.status === 'processing').length,
      icon: 'ri:loader-4-line',
      style: 'bg-warning'
    },
    {
      label: '今日已恢复',
      value: alerts.value.filter((item) => item.status === 'resolved').length,
      icon: 'ri:checkbox-circle-line',
      style: 'bg-success'
    }
  ])
  const filteredAlerts = computed(() =>
    alerts.value.filter(
      (item) =>
        (!filter.keyword ||
          `${item.device} ${item.code} ${item.title}`
            .toLowerCase()
            .includes(filter.keyword.toLowerCase())) &&
        (!filter.severity || item.severity === filter.severity) &&
        (!filter.source || item.source === filter.source) &&
        (!filter.status || item.status === filter.status)
    )
  )
  const trendTimes = [
    '11:00',
    '14:00',
    '17:00',
    '20:00',
    '23:00',
    '02:00',
    '05:00',
    '08:00',
    '10:30'
  ]
  const trendSeries = [
    { name: '严重', data: [0, 0, 0, 0, 0, 0, 0, 0, 1] },
    { name: '警告', data: [0, 1, 0, 0, 0, 0, 0, 1, 3] },
    { name: '提醒', data: [1, 0, 1, 0, 0, 0, 0, 1, 0] }
  ]
  const sourceDistribution = [
    { name: '设备与资源', value: 3 },
    { name: '3D 打印机', value: 2 },
    { name: '奖励出货机', value: 2 },
    { name: '触控屏幕', value: 1 }
  ]
  function openDetail(row: AlertRecord) {
    activeAlert.value = row
    drawerVisible.value = true
  }
  function acknowledge(row: AlertRecord) {
    row.status = 'processing'
    row.logs.push({ time: '09-09 10:31:00', text: '当前管理员已确认告警（演示）', type: 'primary' })
    ElMessage.success('告警已确认')
  }
  function resolve(row: AlertRecord) {
    row.status = 'resolved'
    row.duration = '已恢复'
    row.logs.push({
      time: '09-09 10:32:00',
      text: '当前管理员标记故障已恢复（演示）',
      type: 'success'
    })
    ElMessage.success('已标记为恢复')
  }
  function batchAcknowledge() {
    alerts.value
      .filter((item) => selectedIds.value.includes(item.id) && item.status === 'pending')
      .forEach((item) => {
        item.status = 'processing'
      })
    selectedIds.value = []
    ElMessage.success('已批量确认待处理告警')
  }
  function resetFilters() {
    Object.assign(filter, { keyword: '', severity: '', source: '', status: '' })
  }
  function refresh() {
    ElMessage.success('演示数据已刷新')
  }
</script>

<style scoped lang="scss">
  .alert-page {
    min-height: var(--art-full-height);
    padding: 20px;
  }

  .page-heading,
  .title-line,
  .header-actions,
  .card-heading,
  .drawer-title {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .title-line {
    justify-content: flex-start;
  }

  h1 {
    font-size: 22px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
  }

  h3 {
    font-size: 14px;
  }

  .page-heading p,
  .card-heading p {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .header-actions .el-tag {
    display: inline-flex;
    gap: 5px;
  }

  .summary-row,
  .charts-row,
  .filters {
    row-gap: 10px;
    margin-top: 20px;
  }

  .urgent-alert {
    margin-top: 10px;
  }

  .chart-card,
  .list-card {
    border-radius: 10px;
  }

  .chart-card {
    height: 100%;
  }

  .list-card {
    margin-top: 10px;
  }

  .filters {
    margin-bottom: 16px;
  }

  .filters .el-select,
  .full-button {
    width: 100%;
  }

  .device-cell strong,
  .device-cell span {
    display: block;
  }

  .device-cell span {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .drawer-title {
    margin-bottom: 20px;
  }

  .drawer-title > div {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .drawer-title h2 {
    font-size: 18px;
  }

  .drawer-section {
    margin-top: 24px;
  }

  .drawer-section > p {
    padding: 14px;
    line-height: 1.8;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  @media (width <= 640px) {
    .alert-page {
      padding: 14px;
    }

    .header-actions {
      width: 100%;
    }
  }
</style>
