<template>
  <div
    class="monitor-page page-content art-full-height"
    :class="{ 'monitor-detail-page': isDetailPage }"
  >
    <template v-if="!isDetailPage">
      <header class="page-heading">
        <div>
          <div class="title-line"
            ><h1>设备监控</h1><ElTag type="info" effect="plain">演示数据</ElTag></div
          >
          <p>了解设备运行状态，及时发现资源异常与连接问题。</p>
        </div>
        <span class="preview-note"
          ><ArtSvgIcon icon="ri:information-line" />当前为界面预览，尚未接入实时监控</span
        >
      </header>

      <section class="summary-grid" aria-label="设备状态概览">
        <button
          v-for="card in cards"
          :key="card.key"
          class="summary-card"
          :class="{ selected: activeState === card.key }"
          @click="selectState(card.key)"
        >
          <span class="summary-icon" :class="card.tone"><ArtSvgIcon :icon="card.icon" /></span>
          <span class="summary-copy"
            ><span>{{ card.label }}</span
            ><strong>{{ card.count }}<small>台</small></strong
            ><span class="summary-hint">{{ card.hint }}</span></span
          >
        </button>
      </section>

      <ElCard shadow="never" class="monitor-card">
        <div class="section-heading"
          ><div><h2>运行状态</h2><p>按学校和标签查看设备，点击详情查看运行指标。</p></div
          ><span class="muted">示例快照 · 09-09 10:30</span></div
        >
        <ElForm class="filters" @submit.prevent="applySearch">
          <ElInput
            v-model="draft.keyword"
            clearable
            placeholder="搜索设备名称、编号或 IP"
            aria-label="搜索设备"
            @keyup.enter="applySearch"
            ><template #prefix><ArtSvgIcon icon="ri:search-line" /></template
          ></ElInput>
          <ElSelect v-model="draft.school" clearable placeholder="全部学校" aria-label="学校筛选"
            ><ElOption v-for="school in schools" :key="school" :label="school" :value="school"
          /></ElSelect>
          <ElSelect v-model="draft.tag" clearable placeholder="全部标签" aria-label="标签筛选"
            ><ElOption v-for="tag in tags" :key="tag" :label="tag" :value="tag"
          /></ElSelect>
          <div class="filter-actions"
            ><ElButton type="primary" native-type="submit">查询</ElButton
            ><ElButton @click="resetSearch">重置</ElButton></div
          >
        </ElForm>
        <ElTabs v-model="activeState" @tab-change="page = 1">
          <ElTabPane
            v-for="card in cards"
            :key="card.key"
            :name="card.key"
            :label="`${card.label} (${card.count})`"
          />
        </ElTabs>
        <ElTable
          :data="pagedDevices"
          row-key="id"
          empty-text="没有符合条件的设备，请调整筛选条件"
          :stripe="false"
        >
          <ElTableColumn label="设备 / 所属学校" min-width="245"
            ><template #default="{ row }"
              ><div class="device-cell"
                ><span class="device-icon"><ArtSvgIcon icon="ri:computer-line" /></span
                ><div
                  ><strong>{{ row.name }}</strong
                  ><p>{{ row.school }}</p
                  ><span class="device-code">{{ row.code }}</span></div
                ></div
              ></template
            ></ElTableColumn
          >
          <ElTableColumn label="健康评分" width="130"
            ><template #default="{ row }"
              ><ElTag :type="getHealth(row).type"
                >{{ getHealth(row).score ?? '—' }} · {{ getHealth(row).label }}</ElTag
              ></template
            ></ElTableColumn
          >
          <ElTableColumn label="连接状态" width="105"
            ><template #default="{ row }"
              ><span class="connection" :class="row.state"
                ><i />{{ stateLabels[row.state as DeviceState] }}</span
              ></template
            ></ElTableColumn
          >
          <ElTableColumn label="CPU" width="130"
            ><template #default="{ row }"
              ><MetricBar :value="row.cpu" :available="row.state === 'online'" /></template
          ></ElTableColumn>
          <ElTableColumn label="内存" width="130"
            ><template #default="{ row }"
              ><MetricBar :value="row.memory" :available="row.state === 'online'" /></template
          ></ElTableColumn>
          <ElTableColumn label="磁盘" width="130"
            ><template #default="{ row }"
              ><MetricBar :value="row.disk" :available="row.state === 'online'" /></template
          ></ElTableColumn>
          <ElTableColumn label="运行情况" min-width="155"
            ><template #default="{ row }"
              ><ElTag
                :type="row.state !== 'online' ? 'info' : row.issue ? 'warning' : 'success'"
                effect="light"
                >{{
                  row.state === 'offline'
                    ? '连接中断'
                    : row.state === 'unknown'
                      ? '等待首次心跳'
                      : row.issue || '运行正常'
                }}</ElTag
              ></template
            ></ElTableColumn
          >
          <ElTableColumn label="最后心跳" min-width="155"
            ><template #default="{ row }"
              ><span>{{ row.heartbeat }}</span
              ><p class="muted">{{
                row.state === 'online'
                  ? '30 秒前'
                  : row.state === 'offline'
                    ? '已离线 25 分钟'
                    : '尚未上报'
              }}</p></template
            ></ElTableColumn
          >
          <ElTableColumn label="操作" width="100" fixed="right"
            ><template #default="{ row }"
              ><ElButton link type="primary" @click="openDetails(row)">查看详情</ElButton></template
            ></ElTableColumn
          >
        </ElTable>
        <div class="table-footer"
          ><span class="muted">离线设备的当前指标暂不可用</span
          ><ElPagination
            v-model:current-page="page"
            :page-size="6"
            :total="filteredDevices.length"
            layout="total, prev, pager, next"
        /></div>
      </ElCard>
    </template>
    <template v-else>
      <header class="page-heading"
        ><div><h1>设备监控详情</h1><p>查看一体机运行健康、教学服务与硬件状态。</p></div
        ><ElButton @click="router.push({ name: 'DeviceMonitor' })"
          ><ArtSvgIcon icon="ri:arrow-left-line" />返回设备监控</ElButton
        ></header
      >
      <div v-if="currentDevice" class="monitor-detail-content">
        <div class="detail-heading"
          ><span class="detail-icon"><ArtSvgIcon icon="ri:computer-line" /></span
          ><div
            ><h2>{{ currentDevice.name }}</h2
            ><p class="muted">{{ currentDevice.code }}</p></div
          ><ElTag type="info" effect="plain">{{
            currentDevice.realDevice ? '待接入监控' : '演示数据'
          }}</ElTag></div
        >
        <div class="freshness-bar"
          ><span>采集时间：{{ currentDevice.collectedAt }}</span
          ><span>数据新鲜度：{{ currentDevice.freshness }}</span
          ><ElTag size="small" :type="currentDevice.state === 'online' ? 'success' : 'info'">{{
            currentDevice.state === 'online' ? '实时数据' : '历史 / 待上报'
          }}</ElTag></div
        >
        <ElAlert
          v-if="currentDevice.state !== 'online'"
          :title="
            currentDevice.realDevice
              ? '已定位该设备，监控数据尚未接入'
              : currentDevice.state === 'offline'
                ? '设备已离线，以下为最后一次上报的信息'
                : '设备尚未上报，等待首次连接'
          "
          type="info"
          :closable="false"
          show-icon
          class="detail-alert"
        />
        <MuseumMonitorDetails :device="currentDevice" v-slot="{ navigate }">
          <MonitorAlertOverview :device="currentDevice" @navigate="navigate" />
          <DeviceHealth :device="currentDevice">
            <template #machine
              ><MachineStatus :device="currentDevice" @navigate="navigate"
            /></template>
          </DeviceHealth>
          <ElRow :gutter="10" class="detail-columns">
            <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
              <ElCard shadow="never" class="detail-section"
                ><h3>基本信息</h3><p class="detail-subtitle">学校归属、连接状态与设备标识。</p>
                <ElRow :gutter="10" class="resource-grid">
                  <ElCol
                    v-for="item in [
                      { label: '所属学校', value: currentDevice.school },
                      {
                        label: '连接状态',
                        value: currentDevice.realDevice ? '未知' : stateLabels[currentDevice.state]
                      },
                      { label: '客户端版本', value: currentDevice.version },
                      { label: 'IP 地址', value: currentDevice.ip },
                      { label: '运行时长', value: currentDevice.uptime },
                      { label: '电源状态', value: currentDevice.powerState },
                      { label: '离线原因', value: currentDevice.offlineReason },
                      { label: '安装位置', value: currentDevice.location },
                      { label: '最后心跳', value: currentDevice.heartbeat }
                    ]"
                    :key="item.label"
                    :xs="24"
                    :sm="12"
                    :md="12"
                    :lg="12"
                    :xl="12"
                  >
                    <div class="detail-info-cell"
                      ><span>{{ item.label }}</span
                      ><strong>{{ item.value || '—' }}</strong></div
                    >
                  </ElCol>
                  <ElCol :xs="24" :sm="12" :md="12" :lg="12" :xl="12"
                    ><div class="detail-info-cell"
                      ><span>设备标签</span
                      ><div class="tag-list"
                        ><ElTag v-for="tag in currentDevice.tags" :key="tag" type="info">{{
                          tag
                        }}</ElTag
                        ><span v-if="!currentDevice.tags.length">暂无标签</span></div
                      ></div
                    ></ElCol
                  >
                </ElRow></ElCard
              >
            </ElCol>
            <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12" class="detail-metrics-column">
              <ElCard shadow="never" class="detail-section"
                ><h3>近 24 小时连接记录 <small>示例</small></h3
                ><div v-if="currentDevice.state === 'unknown'" class="empty-history"
                  >暂无连接记录</div
                ><template v-else
                  ><div class="availability" aria-label="24小时连接记录，绿色在线，灰色离线"
                    ><span
                      v-for="hour in 24"
                      :key="hour"
                      :class="{ gap: currentDevice.state === 'offline' && hour === 24 }" /></div
                  ><div class="history-scale"><span>昨天 10:30</span><span>今天 10:30</span></div
                  ><p class="history-legend"><i />在线 <i class="gap" />离线</p>
                  <h3>最近状态趋势</h3
                  ><p class="detail-subtitle">示例事件计数 · 每个时间点的记录数量</p>
                  <ArtLineChart
                    :data="recentStateSeries"
                    :x-axis-data="['08:00', '09:00', '10:00', '10:30']"
                    :smooth="false"
                    :show-legend="true"
                    height="240px"
                  />
                  <p class="muted"
                    >最近状态：{{
                      currentDevice.issue ||
                      (currentDevice.state === 'offline'
                        ? '心跳超时，设备连接中断'
                        : '心跳上报成功')
                    }}</p
                  ></template
                ></ElCard
              >
            </ElCol>
          </ElRow>
        </MuseumMonitorDetails>
      </div>
      <ElEmpty v-else description="设备参数无效或示例设备不存在，请返回设备监控重新选择" />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'
  import DeviceHealth from './device-health.vue'
  import MachineStatus from './machine-status.vue'
  import MonitorAlertOverview from './monitor-alert-overview.vue'
  import { getHealth } from './health-score'
  import { devices } from '../shared/device-store'
  import { ElProgress } from 'element-plus'
  import MuseumMonitorDetails from './museum-monitor-details.vue'

  defineOptions({ name: 'DeviceMonitor' })
  type DeviceState = 'online' | 'offline' | 'unknown'
  type StateFilter = 'all' | DeviceState | 'attention'
  interface MonitorDevice {
    realDevice?: boolean
    id: number
    name: string
    code: string
    school: string
    state: DeviceState
    tags: string[]
    cpu: number | null
    memory: number | null
    disk: number | null
    heartbeat: string
    ip: string
    version: string
    uptime: string
    location: string
    issue: string
    powerState: string
    offlineReason: string
    collectedAt: string
    freshness: string
  }
  const recentStateSeries = computed(() => [
    { name: '客户端启动', data: [1, 0, 0, 0] },
    { name: '心跳正常', data: [1, 1, 1, currentDevice.value?.state === 'online' ? 1 : 0] },
    { name: '连接中断', data: [0, 0, 0, currentDevice.value?.state === 'offline' ? 1 : 0] },
    {
      name: '资源告警',
      data: [0, 0, 0, currentDevice.value?.issue && currentDevice.value?.state === 'online' ? 1 : 0]
    }
  ])
  const stateLabels: Record<DeviceState, string> = {
    online: '在线',
    offline: '离线',
    unknown: '未激活'
  }
  const demoDevices: MonitorDevice[] = [
    {
      id: 1,
      name: '一楼展厅互动终端',
      code: 'DEMO-001',
      school: '示例学校 · 第一小学',
      state: 'online',
      tags: ['展厅设备'],
      cpu: 24,
      memory: 46,
      disk: 38,
      heartbeat: '09-09 10:29:30',
      ip: '192.0.2.11',
      version: 'v0.0.4',
      uptime: '2 天 6 小时',
      location: '一楼展厅入口',
      issue: '',
      powerState: '已开机',
      offlineReason: '—',
      collectedAt: '09-09 10:30:00（示例）',
      freshness: '刚刚'
    },
    {
      id: 2,
      name: '科学教室教学终端',
      code: 'DEMO-002',
      school: '示例学校 · 第一小学',
      state: 'online',
      tags: ['教学设备', '重点监控'],
      cpu: 88,
      memory: 72,
      disk: 41,
      heartbeat: '09-09 10:29:30',
      ip: '192.0.2.12',
      version: 'v0.0.4',
      uptime: '6 小时 30 分钟',
      location: '二楼科学教室',
      issue: 'CPU 占用偏高',
      powerState: '已开机',
      offlineReason: '—',
      collectedAt: '09-09 10:30:00（示例）',
      freshness: '刚刚'
    },
    {
      id: 3,
      name: '图书馆导览终端',
      code: 'DEMO-003',
      school: '示例学校 · 实验小学',
      state: 'online',
      tags: ['展厅设备'],
      cpu: 18,
      memory: 39,
      disk: 92,
      heartbeat: '09-09 10:29:30',
      ip: '192.0.2.13',
      version: 'v0.0.4',
      uptime: '1 天 3 小时',
      location: '图书馆服务台',
      issue: '磁盘空间不足',
      powerState: '已开机',
      offlineReason: '—',
      collectedAt: '09-09 10:30:00（示例）',
      freshness: '刚刚'
    },
    {
      id: 4,
      name: '文化长廊展示终端',
      code: 'DEMO-004',
      school: '示例学校 · 实验小学',
      state: 'offline',
      tags: ['重点监控'],
      cpu: 32,
      memory: 48,
      disk: 57,
      heartbeat: '09-09 10:05:00',
      ip: '192.0.2.14',
      version: 'v0.0.3',
      uptime: '3 天 2 小时',
      location: '一楼文化长廊',
      issue: '',
      powerState: '已关机',
      offlineReason: '设备主动关机',
      collectedAt: '09-09 10:05:00（示例）',
      freshness: '25 分钟前'
    },
    {
      id: 5,
      name: '创新空间试点终端',
      code: 'DEMO-005',
      school: '示例学校 · 第二小学',
      state: 'online',
      tags: ['试点设备'],
      cpu: 35,
      memory: 52,
      disk: 29,
      heartbeat: '09-09 10:29:30',
      ip: '192.0.2.15',
      version: 'v0.0.4',
      uptime: '4 小时 12 分钟',
      location: '三楼创新空间',
      issue: '',
      powerState: '已开机',
      offlineReason: '—',
      collectedAt: '09-09 10:30:00（示例）',
      freshness: '刚刚'
    },
    {
      id: 6,
      name: '备用互动终端',
      code: 'DEMO-006',
      school: '未关联学校',
      state: 'unknown',
      tags: ['备用设备'],
      cpu: null,
      memory: null,
      disk: null,
      heartbeat: '—',
      ip: '—',
      version: '—',
      uptime: '—',
      location: '待部署',
      issue: '',
      powerState: '待上报',
      offlineReason: '尚未首次连接',
      collectedAt: '—',
      freshness: '暂无数据'
    }
  ]
  const MetricBar = defineComponent({
    props: {
      value: { type: Number, default: null },
      available: Boolean,
      showValue: { type: Boolean, default: true }
    },
    setup: (props) => () =>
      props.available && props.value !== null
        ? h('div', { class: 'metric' }, [
            props.showValue ? h('span', `${props.value}%`) : null,
            h(ElProgress, {
              percentage: props.value,
              showText: false,
              strokeWidth: 5,
              color:
                props.value >= 90
                  ? 'var(--el-color-danger)'
                  : props.value >= 80
                    ? 'var(--el-color-warning)'
                    : 'var(--el-color-primary)'
            })
          ])
        : h('span', { class: 'muted' }, '—')
  })
  const cards: {
    key: StateFilter
    label: string
    count: number
    hint: string
    icon: string
    tone: string
  }[] = [
    {
      key: 'all',
      label: '全部设备',
      count: 6,
      hint: '覆盖 3 所示例学校',
      icon: 'ri:device-line',
      tone: 'primary'
    },
    {
      key: 'online',
      label: '在线设备',
      count: 4,
      hint: '心跳连接正常',
      icon: 'ri:wifi-line',
      tone: 'success'
    },
    {
      key: 'offline',
      label: '离线设备',
      count: 1,
      hint: '超过 2 分钟无心跳',
      icon: 'ri:wifi-off-line',
      tone: 'neutral'
    },
    {
      key: 'attention',
      label: '资源异常',
      count: 2,
      hint: '需要关注运行指标',
      icon: 'ri:alert-line',
      tone: 'warning'
    },
    {
      key: 'unknown',
      label: '未激活',
      count: 1,
      hint: '等待首次连接',
      icon: 'ri:time-line',
      tone: 'neutral'
    }
  ]
  const schools = [...new Set(demoDevices.map((device) => device.school))]
  const tags = [...new Set(demoDevices.flatMap((device) => device.tags))]
  const draft = reactive({ keyword: '', school: '', tag: '' })
  const applied = reactive({ ...draft })
  const activeState = ref<StateFilter>('all')
  const page = ref(1)
  const currentDevice = ref<MonitorDevice>()
  const route = useRoute()
  const router = useRouter()
  const isDetailPage = computed(() => route.name === 'DeviceMonitorDetail')
  watch(
    () => [
      route.path,
      route.query.deviceId,
      route.query.deviceName,
      route.query.deviceCode,
      route.query.source
    ],
    () => {
      if (route.name !== 'DeviceMonitorDetail' && route.name !== 'DeviceMonitor') return
      currentDevice.value = undefined
      const id = Number(route.query.deviceId)
      if (!Number.isSafeInteger(id) || id <= 0) return
      if (route.name === 'DeviceMonitor') {
        void router.replace({ name: 'DeviceMonitorDetail', query: route.query })
        return
      }
      if (route.query.source === 'demo') {
        currentDevice.value = demoDevices.find((item) => item.id === id)
        return
      }
      const device = devices.value.find((item) => item.id === id)
      currentDevice.value = {
        id,
        realDevice: true,
        name:
          device?.deviceName ||
          (typeof route.query.deviceName === 'string' ? route.query.deviceName : `设备 ${id}`),
        code:
          device?.deviceCode ||
          (typeof route.query.deviceCode === 'string' ? route.query.deviceCode : '—'),
        school: device?.schoolName || '—',
        tags: device?.tags?.map((tag) => tag.name) || [],
        state: 'unknown',
        cpu: null,
        memory: null,
        disk: null,
        heartbeat: '—',
        ip: device?.ipAddress || '—',
        version: device?.clientVersion || '—',
        uptime: '—',
        location: device?.location || '—',
        issue: '',
        powerState: '待上报',
        offlineReason: '待设备上报',
        collectedAt: '—',
        freshness: '暂无数据'
      }
    },
    { immediate: true }
  )
  const filteredDevices = computed(() =>
    demoDevices.filter(
      (device) =>
        (activeState.value === 'all' ||
          (activeState.value === 'attention'
            ? device.state === 'online' && !!device.issue
            : device.state === activeState.value)) &&
        (!applied.school || device.school === applied.school) &&
        (!applied.tag || device.tags.includes(applied.tag)) &&
        `${device.name} ${device.code} ${device.ip}`
          .toLowerCase()
          .includes(applied.keyword.toLowerCase())
    )
  )
  const pagedDevices = computed(() =>
    filteredDevices.value.slice((page.value - 1) * 6, page.value * 6)
  )
  function applySearch() {
    Object.assign(applied, draft, { keyword: draft.keyword.trim() })
    page.value = 1
  }
  function resetSearch() {
    Object.assign(draft, { keyword: '', school: '', tag: '' })
    activeState.value = 'all'
    applySearch()
  }
  function selectState(state: StateFilter) {
    activeState.value = state
    page.value = 1
  }
  function openDetails(device: MonitorDevice) {
    void router.push({
      name: 'DeviceMonitorDetail',
      query: { deviceId: String(device.id), source: 'demo' }
    })
  }
</script>

<style scoped lang="scss">
  .monitor-detail-page {
    height: var(--art-full-height);
    min-height: 0;
    overflow: hidden auto !important;
    // Override the layout's higher-specificity .page-content overflow: hidden rule.
    scrollbar-gutter: stable;

    > * {
      flex-shrink: 0;
    }
  }

  .monitor-detail-content {
    background: var(--el-bg-color);
    border-radius: 12px;
  }

  .detail-columns {
    row-gap: 10px;
    align-items: start;
  }

  .detail-metrics-column {
    min-width: 0;
  }

  .monitor-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .page-heading,
  .title-line,
  .section-heading,
  .table-footer,
  .detail-heading {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .title-line {
    gap: 12px;
    justify-content: flex-start;
  }

  h1 {
    font-size: 22px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  p {
    margin-top: 6px;
  }

  .page-heading p,
  .section-heading p,
  .muted,
  .preview-note {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .preview-note {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
  }

  .summary-card {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 20px;
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    transition: border-color 0.2s;
  }

  .summary-card:hover,
  .summary-card.selected {
    border-color: var(--el-color-primary);
  }

  .summary-card:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }

  .summary-icon,
  .device-icon,
  .detail-icon {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 44px;
    height: 44px;
    font-size: 23px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-radius: 12px;
  }

  .summary-icon.primary {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .summary-icon.success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  .summary-icon.warning {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }

  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }

  .summary-copy strong {
    font-size: 30px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--el-text-color-primary);
  }

  .summary-copy small {
    margin-left: 8px;
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  .summary-hint {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .monitor-card {
    border-radius: 12px;
  }

  .section-heading {
    margin-bottom: 22px;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(160px, 1fr) auto;
    gap: 12px;
    margin-bottom: 16px;
  }

  .filter-actions {
    display: flex;
  }

  .device-cell {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 9px 0;
  }

  .device-cell strong {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .device-cell p,
  .device-code {
    margin: 0;
    font-size: 12px;
    line-height: 20px;
    color: var(--el-text-color-secondary);
  }

  .device-code {
    font-family: ui-monospace, monospace;
  }

  .connection {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    font-size: 12px;
    white-space: nowrap;
  }

  .connection i {
    width: 6px;
    height: 6px;
    background: var(--el-text-color-placeholder);
    border-radius: 50%;
  }

  .connection.online {
    color: var(--el-color-success);
  }

  .connection.online i {
    background: var(--el-color-success);
  }

  :deep(.metric) {
    max-width: 92px;
    font-variant-numeric: tabular-nums;
  }

  :deep(.metric > span) {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .table-footer {
    flex-wrap: wrap;
    margin-top: 22px;
  }

  .detail-heading {
    justify-content: flex-start;
    margin-bottom: 24px;
  }

  .detail-heading > .el-tag {
    margin-left: auto;
  }

  .detail-icon {
    width: 52px;
    height: 52px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .detail-alert {
    margin-bottom: 20px;
  }

  .freshness-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    padding: 10px 14px;
    margin: -10px 0 20px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .freshness-bar .el-tag {
    margin-left: auto;
  }

  .detail-section {
    margin-bottom: 10px;
    border-radius: 10px;
  }

  .detail-section h3 {
    margin: 0 0 16px;
    font-size: 16px;
  }

  .detail-subtitle {
    margin: -8px 0 18px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .detail-info-cell {
    height: 100%;
    padding: 16px;
    overflow-wrap: anywhere;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 8px;
  }

  .detail-info-cell > span {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .detail-info-cell strong {
    font-size: 13px;
    font-weight: 600;
  }

  .detail-section :deep(.el-card__body) {
    padding: 20px;
  }

  h3 {
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
  }

  h3 small {
    margin-left: 8px;
    font-size: 11px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .resource-grid {
    row-gap: 10px;
  }

  .resource-card {
    padding: 16px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 8px;
  }

  .resource-card strong {
    display: block;
    margin: 12px 0;
    font-size: 24px;
    font-weight: 500;
  }

  .resource-card :deep(.metric) {
    max-width: none;
  }

  .availability {
    display: grid;
    grid-template-columns: repeat(24, 1fr);
    gap: 4px;
  }

  .availability span {
    height: 28px;
    background: var(--el-color-success-light-5);
    border-radius: 3px;
  }

  .availability .gap,
  .history-legend .gap {
    background: var(--el-fill-color-darker);
  }

  .history-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .history-legend {
    display: flex;
    gap: 7px;
    align-items: center;
    justify-content: flex-end;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .history-legend i {
    width: 8px;
    height: 8px;
    margin-left: 8px;
    background: var(--el-color-success-light-5);
    border-radius: 2px;
  }

  .empty-history {
    padding: 28px;
    color: var(--el-text-color-secondary);
    text-align: center;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  @media (width <= 1200px) {
    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .filters {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (width <= 640px) {
    .page-heading,
    .section-heading {
      flex-direction: column;
      align-items: flex-start;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .summary-card {
      gap: 10px;
      padding: 14px;
    }

    .summary-icon {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }

    .summary-copy strong {
      font-size: 26px;
    }

    .filters {
      grid-template-columns: 1fr;
    }

    .detail-heading {
      flex-wrap: wrap;
    }

    .resource-card {
      padding: 10px;
    }
  }
</style>
