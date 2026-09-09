<template>
  <ElTabs v-model="activeTab" class="museum-tabs">
    <ElTabPane label="运行总览" name="overview">
      <ElRow :gutter="10" class="module-row">
        <ElCol v-for="item in overview" :key="item.label" :xs="12" :sm="8" :md="8" :lg="4" :xl="4">
          <button class="module-card" @click="activeTab = item.tab">
            <ArtSvgIcon :icon="item.icon" /><span>{{ item.label }}</span>
            <strong :class="{ warning: available && item.warning }">{{ value(item.value) }}</strong>
            <small
              >{{ available ? item.note : '等待设备上报' }}
              <ArtSvgIcon icon="ri:arrow-right-s-line"
            /></small>
          </button>
        </ElCol>
      </ElRow>
      <slot :navigate="(tab: string) => (activeTab = tab)" />
    </ElTabPane>
    <ElTabPane label="教学与内容" name="teaching">
      <ElRow :gutter="10" class="panel-row">
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><h3>课堂与文物互动</h3><InfoList :items="teaching" :available="available" /></section
        ></ElCol>
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><h3>校园展示与内容同步</h3
            ><InfoList :items="content" :available="available" /></section
        ></ElCol>
        <ElCol :span="24"
          ><section class="panel"
            ><div class="panel-heading"
              ><h3>资源就绪情况</h3
              ><ElTag type="info">{{ available ? '示例资源包' : '待上报' }}</ElTag></div
            ><ElTable :data="available ? resources : []" empty-text="暂无资源同步记录"
              ><ElTableColumn prop="name" label="资源包" min-width="200" /><ElTableColumn
                prop="version"
                label="版本"
                width="150" /><ElTableColumn prop="size" label="大小" width="120" /><ElTableColumn
                label="同步进度"
                min-width="180"
                ><template #default="{ row }"
                  ><ElProgress
                    :percentage="row.progress"
                    :status="
                      row.progress === 100 ? 'success' : undefined
                    " /></template></ElTableColumn
              ><ElTableColumn prop="offline" label="离线使用" width="120" /><ElTableColumn
                prop="state"
                label="状态"
                min-width="130" /></ElTable
            ><p class="note">资源未下载完成时，离线使用状态显示为不可用。</p></section
          ></ElCol
        >
      </ElRow>
    </ElTabPane>
    <ElTabPane label="AI 数字人" name="ai" lazy>
      <ElRow :gutter="10" class="panel-row">
        <ElCol
          v-for="service in services"
          :key="service.name"
          :xs="24"
          :sm="12"
          :md="6"
          :lg="6"
          :xl="6"
          ><section class="panel service-card"
            ><ArtSvgIcon :icon="service.icon" /><h3>{{ service.name }}</h3
            ><ElTag :type="available ? 'success' : 'info'">{{
              available ? '服务可用' : '待上报'
            }}</ElTag
            ><p>{{ value(service.time) }}</p></section
          ></ElCol
        >
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><h3>数字人互动状态</h3><InfoList :items="avatar" :available="available" /></section
        ></ElCol>
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><h3>今日服务质量</h3><InfoList :items="aiQuality" :available="available" /><p
              class="note"
              >按设备汇总；下方请求记录展示模拟问题、回答与知识引用，供调优使用。</p
            ></section
          ></ElCol
        >
      </ElRow>
      <AiRequestMonitor :device="device" />
    </ElTabPane>
    <ElTabPane label="3D 打印" name="printing">
      <ElAlert
        title="云端展示打印状态；温控、门禁联锁和急停保护由设备本地执行。"
        type="info"
        :closable="false"
        show-icon
        class="printing-note"
      />
      <ElRow :gutter="10" class="panel-row">
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><div class="panel-heading"
              ><h3>当前打印任务</h3
              ><ElTag :type="available ? 'primary' : 'info'">{{ value('打印中') }}</ElTag></div
            ><div class="print-progress"
              ><ElProgress
                type="dashboard"
                :percentage="available ? 64 : 0"
                :format="printFormat"
                :width="170"
              /><div
                ><h3>{{ value('青铜鼎 · 文创缩小模型') }}</h3
                ><p>{{ available ? '任务编号 PRINT-DEMO-001' : '暂无打印任务数据' }}</p
                ><p>预计剩余：{{ value('28 分钟') }}</p
                ><p>已用时间：{{ value('50 分钟') }}</p></div
              ></div
            ><InfoList :items="printTask" :available="available" /></section
        ></ElCol>
        <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
          ><section class="panel"
            ><h3>打印机与机柜状态</h3><InfoList :items="printer" :available="available" /><p
              class="note"
              >未安装的模块应显示“未配置”；尚未采集的指标显示“待上报”。</p
            ></section
          ></ElCol
        >
        <ElCol :span="24"
          ><section class="panel"
            ><h3>打印队列</h3
            ><ElTable :data="available ? printQueue : []" empty-text="暂无打印队列数据"
              ><ElTableColumn prop="name" label="作品 / 任务" min-width="180" /><ElTableColumn
                prop="material"
                label="耗材"
                width="120" /><ElTableColumn
                prop="duration"
                label="预计耗时"
                width="140" /><ElTableColumn
                prop="state"
                label="状态"
                min-width="140" /></ElTable></section
        ></ElCol>
      </ElRow>
    </ElTabPane>
    <ElTabPane label="硬件与网络" name="hardware" lazy>
      <HardwarePeripherals :device="device" />
      <MonitorTelemetry :device="device" />
    </ElTabPane>
    <ElTabPane label="事件记录" name="events">
      <section class="panel"
        ><div class="panel-heading"
          ><h3>设备事件</h3
          ><ElSelect v-model="eventType" aria-label="事件类型" style="width: 170px"
            ><ElOption label="全部类型" value="all" /><ElOption
              label="内容同步"
              value="content" /><ElOption label="AI 服务" value="ai" /><ElOption
              label="打印任务"
              value="printing" /><ElOption label="设备运行" value="system" /></ElSelect></div
        ><ElTable :data="filteredEvents" empty-text="暂无事件上报"
          ><ElTableColumn prop="time" label="时间" width="180" /><ElTableColumn
            prop="category"
            label="类型"
            width="140" /><ElTableColumn label="级别" width="100"
            ><template #default="{ row }"
              ><ElTag :type="row.warning ? 'warning' : 'info'">{{
                row.warning ? '提醒' : '信息'
              }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn prop="message" label="事件内容" min-width="300" /></ElTable
      ></section>
      <section class="panel operation-audit">
        <div class="panel-heading"
          ><div
            ><h3>远程操作审计</h3
            ><p class="note">记录远程操作的操作者、原因与执行结果。当前仅为审计界面演示。</p></div
          ><ElTag type="info">演示记录</ElTag></div
        >
        <ElTable :data="available ? operationAudits : []" empty-text="暂无远程操作记录">
          <ElTableColumn prop="time" label="操作时间（示例）" width="180" /><ElTableColumn
            prop="operator"
            label="操作者"
            width="130"
          /><ElTableColumn prop="action" label="操作" width="130" /><ElTableColumn
            prop="reason"
            label="原因"
            min-width="220"
          />
          <ElTableColumn label="结果" width="110"
            ><template #default="{ row }"
              ><ElTag :type="row.success ? 'success' : 'danger'">{{
                row.success ? '执行成功' : '执行失败'
              }}</ElTag></template
            ></ElTableColumn
          >
          <ElTableColumn prop="detail" label="执行详情" min-width="220" />
        </ElTable>
      </section>
    </ElTabPane>
  </ElTabs>
</template>

<script setup lang="ts">
  import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
  import { ElDescriptions, ElDescriptionsItem } from 'element-plus'
  import MonitorTelemetry from './monitor-telemetry.vue'
  import HardwarePeripherals from './hardware-peripherals.vue'
  import AiRequestMonitor from './ai-request-monitor.vue'
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
  const activeTab = ref('overview')
  const eventType = ref('all')
  watch(
    () => props.device,
    () => {
      activeTab.value = 'overview'
      eventType.value = 'all'
    }
  )
  const available = computed(() => !props.device.realDevice && props.device.state !== 'unknown')
  const value = (text: string) => (available.value ? text : '待上报')
  const printFormat = (percentage: number) => (available.value ? `${percentage}%` : '待上报')
  type Info = { label: string; value: string }
  const InfoList = defineComponent({
    props: { items: { type: Array as PropType<Info[]>, required: true }, available: Boolean },
    setup: (p) => () =>
      h(
        ElDescriptions,
        { column: 1, border: true },
        {
          default: () =>
            p.items.map((item) =>
              h(
                ElDescriptionsItem,
                { label: item.label },
                { default: () => (p.available ? item.value : '待上报') }
              )
            )
        }
      )
  })
  const overview = computed(() => [
    {
      label: '设备连接',
      value: props.device.state === 'offline' ? '已离线' : '在线',
      note: '查看硬件与网络',
      icon: 'ri:wifi-line',
      tab: 'hardware',
      warning: props.device.state === 'offline'
    },
    {
      label: '课堂可用状态',
      value: '离线课程已就绪',
      note: '核心资源可本地使用',
      icon: 'ri:presentation-line',
      tab: 'teaching'
    },
    {
      label: '资源同步',
      value: '1 项下载中',
      note: '2 项资源包已就绪',
      icon: 'ri:download-cloud-line',
      tab: 'teaching'
    },
    {
      label: 'AI 服务',
      value: '服务可用',
      note: '识别 · 问答 · 合成',
      icon: 'ri:robot-2-line',
      tab: 'ai'
    },
    {
      label: '3D 打印',
      value: '打印中 · 64%',
      note: '预计剩余 28 分钟',
      icon: 'ri:printer-line',
      tab: 'printing'
    },
    {
      label: '待关注事件',
      value: '1 条提醒',
      note: '语音请求曾触发重试',
      icon: 'ri:notification-3-line',
      tab: 'events',
      warning: true
    }
  ])
  const teaching = [
    { label: '当前模块', value: '文物数字名片' },
    { label: '当前文物', value: '错银铜牛灯' },
    { label: '使用模式', value: '课堂模式' },
    { label: '当前课程', value: '文物中的古代智慧' },
    { label: '课程语言', value: '繁体中文 · 粤语' },
    { label: '本次使用时长', value: '18 分钟' },
    { label: '3D 模型加载', value: '成功 · 1.2 秒' },
    { label: '今日互动次数', value: '126 次（设备汇总）' }
  ]
  const content = [
    { label: '当前主题', value: '中华传统工艺展' },
    { label: '文物库版本', value: 'DEMO-2026.09' },
    { label: '本地文物资源', value: '36 项' },
    { label: '离线课程', value: '12 节可用' },
    { label: '校园内容', value: '校史馆 · 已同步' },
    { label: '展示排期', value: '课间导览 · 正常执行' },
    { label: '广播节目', value: '校园文化午间播报 · 待播放' },
    { label: '最近同步', value: '09-09 10:20（示例）' }
  ]
  const resources = [
    {
      name: '国宝文物基础包',
      version: 'DEMO-1.2',
      size: '1.6 GB',
      progress: 100,
      offline: '可用',
      state: '已就绪'
    },
    {
      name: '学校校史与学生作品展',
      version: 'DEMO-1.0',
      size: '320 MB',
      progress: 100,
      offline: '可用',
      state: '已就绪'
    },
    {
      name: '丝绸之路主题展',
      version: 'DEMO-2.0',
      size: '850 MB',
      progress: 72,
      offline: '不可用',
      state: '下载中'
    }
  ]
  const services = [
    { name: '数字人渲染', time: '渲染帧率 60 FPS', icon: 'ri:user-smile-line' },
    { name: '语音识别', time: '平均耗时 420 ms', icon: 'ri:mic-line' },
    { name: '文化问答', time: '首字响应 1.3 秒', icon: 'ri:chat-3-line' },
    { name: '语音合成', time: '首段音频 380 ms', icon: 'ri:volume-up-line' }
  ]
  const avatar = [
    { label: '当前形象', value: '小小文博讲解员（示例）' },
    { label: '形象资源', value: '加载完成' },
    { label: '互动状态', value: '等待唤醒' },
    { label: '识别语言', value: '粤语 / 普通话' },
    { label: '输出语言', value: '粤语' },
    { label: '知识库', value: '文物百科 DEMO-1.2' },
    { label: '兜底方式', value: '本地预设话术' }
  ]
  const aiQuality = [
    { label: '问答请求', value: '84 次' },
    { label: '请求成功率', value: '97.6%' },
    { label: '平均回答耗时', value: '2.1 秒' },
    { label: '请求失败', value: '2 次' },
    { label: '兜底回答', value: '3 次' },
    { label: '教师助教任务', value: '4 次已完成' },
    { label: '内容审核服务', value: '可用' }
  ]
  const printTask = [
    { label: '打印材料', value: 'PLA' },
    { label: '预计用料', value: '18 g' },
    { label: '打印层数', value: '128 / 200 层' },
    { label: '作品文件校验', value: '通过' }
  ]
  const printer = [
    { label: '打印机连接', value: '已连接' },
    { label: '喷嘴温度', value: '205 ℃ / 目标 205 ℃' },
    { label: '热床温度', value: '55 ℃ / 目标 55 ℃' },
    { label: '耗材检测', value: '有料' },
    { label: '打印舱门', value: '已关闭' },
    { label: '本地门禁联锁', value: '已启用' },
    { label: '急停状态', value: '未触发' },
    { label: '机柜温度 / 风扇', value: '31 ℃ / 运转中' },
    { label: '展示柜门', value: '已关闭' },
    { label: '烟雾传感器', value: '未配置' },
    { label: '当前故障', value: '无' }
  ]
  const printQueue = [
    { name: '青铜鼎 · 文创缩小模型', material: 'PLA', duration: '78 分钟', state: '打印中' },
    { name: '传统纹样书签', material: 'PLA', duration: '22 分钟', state: '等待教师确认' }
  ]
  const operationAudits = [
    {
      time: '09-09 09:42:18',
      operator: '系统管理员（示例）',
      action: '刷新内容',
      reason: '校本资源包更新后重新同步',
      success: true,
      detail: '任务 REMOTE-DEMO-003 已完成'
    },
    {
      time: '09-08 16:20:05',
      operator: '学校管理员（示例）',
      action: '重新出货',
      reason: '教师确认奖励未掉落',
      success: false,
      detail: '掉落传感器确认超时，已转人工核查'
    },
    {
      time: '09-08 08:02:11',
      operator: '系统管理员（示例）',
      action: '重启客户端',
      reason: '客户端更新后应用新版本',
      success: true,
      detail: '客户端 v0.0.4 启动并恢复心跳'
    }
  ]
  const events = [
    {
      time: '09-09 10:30',
      type: 'printing',
      category: '打印任务',
      warning: false,
      message: '打印进度达到 64%，设备本地运行中'
    },
    {
      time: '09-09 10:25',
      type: 'ai',
      category: 'AI 服务',
      warning: true,
      message: '语音识别请求超时，自动重试后恢复'
    },
    {
      time: '09-09 10:20',
      type: 'content',
      category: '内容同步',
      warning: false,
      message: '校史资源包同步完成，离线内容已就绪'
    },
    {
      time: '09-09 08:00',
      type: 'system',
      category: '设备运行',
      warning: false,
      message: '客户端启动，开始上报心跳'
    }
  ]
  const filteredEvents = computed(() =>
    available.value
      ? events.filter((item) => eventType.value === 'all' || item.type === eventType.value)
      : []
  )
</script>

<style scoped lang="scss">
  .module-row,
  .panel-row {
    row-gap: 10px;
    margin-bottom: 24px;
  }

  .module-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    height: 100%;
    padding: 20px;
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }

  .module-card:hover {
    border-color: var(--el-color-primary);
  }

  .module-card > :first-child {
    font-size: 24px;
    color: var(--el-color-primary);
  }

  .module-card strong {
    font-size: 16px;
    color: var(--el-text-color-primary);
  }

  .module-card strong.warning {
    color: var(--el-color-warning);
  }

  .module-card small {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .panel {
    height: 100%;
    padding: 20px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }

  h3 {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
  }

  .panel-heading {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .panel-heading h3 {
    margin: 0;
  }

  .note,
  .print-progress p {
    margin-top: 12px;
    font-size: 12px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }

  .service-card > :first-child {
    margin-bottom: 12px;
    font-size: 24px;
    color: var(--el-color-primary);
  }

  .service-card p {
    margin-top: 14px;
    font-size: 13px;
  }

  .print-progress {
    display: flex;
    flex-wrap: wrap;
    gap: 28px;
    align-items: center;
    margin-bottom: 20px;
  }

  .printing-note {
    margin-bottom: 16px;
  }

  @media (width <= 640px) {
    .panel,
    .module-card {
      padding: 14px;
    }
  }
</style>
