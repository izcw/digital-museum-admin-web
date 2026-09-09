<template>
  <section class="peripherals">
    <ElAlert :title="notice" type="info" :closable="false" show-icon />
    <ElRow :gutter="10" class="hardware-row">
      <ElCol v-for="panel in panels" :key="panel.name" :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <section class="hardware-card">
          <header>
            <div
              ><ArtSvgIcon :icon="panel.icon" /><h3>{{ panel.name }}</h3></div
            >
            <ElTag :type="available ? panel.type : 'info'">{{ value(panel.status) }}</ElTag>
          </header>
          <p class="description">{{ panel.description }}</p>
          <ElRow :gutter="10" class="stat-row">
            <ElCol
              v-for="stat in panel.stats"
              :key="stat.label"
              :xs="12"
              :sm="12"
              :md="12"
              :lg="6"
              :xl="6"
            >
              <div class="stat"
                ><span>{{ stat.label }}</span
                ><strong>{{ value(stat.value) }}</strong></div
              >
            </ElCol>
          </ElRow>
          <div class="task">
            <div class="section-heading"
              ><h4>{{ panel.taskLabel }}</h4
              ><span>{{ value(panel.task) }}</span></div
            >
            <ElProgress
              :percentage="available ? panel.progress : 0"
              :format="(n) => (available ? `${n}%` : '待上报')"
            />
            <p>{{ available ? panel.taskNote : '等待设备上报任务与数量' }}</p>
          </div>
          <h4>运行状态</h4>
          <ElDescriptions :column="1" border size="small">
            <ElDescriptionsItem
              v-for="item in panel.states"
              :key="item.label"
              :label="item.label"
              >{{ value(item.value) }}</ElDescriptionsItem
            >
          </ElDescriptions>
          <div class="section-heading inventory-heading"
            ><h4>{{ panel.stockTitle }}</h4
            ><ElTag type="info">{{ value(panel.stockSummary) }}</ElTag></div
          >
          <ElTable
            :data="available ? panel.stock : []"
            empty-text="等待耗材 / 库存上报"
            size="small"
          >
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="remaining" label="剩余数量" min-width="100" />
            <ElTableColumn label="状态" min-width="90"
              ><template #default="{ row }"
                ><ElTag :type="row.warning ? 'warning' : 'success'" size="small">{{
                  row.status
                }}</ElTag></template
              ></ElTableColumn
            >
          </ElTable>
          <div class="warning"
            ><ElAlert
              :title="available ? panel.warning : '暂无告警数据，等待设备上报'"
              :type="available ? 'warning' : 'info'"
              :closable="false"
              show-icon
          /></div>
        </section>
      </ElCol>
    </ElRow>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  const props = defineProps<{ device: { realDevice?: boolean; state: string } }>()
  const available = computed(() => !props.device.realDevice && props.device.state !== 'unknown')
  const value = (text: string) => (available.value ? text : '待上报')
  const notice = computed(() =>
    !available.value
      ? '打印机与奖励机监控等待设备接入，暂无硬件上报数据。'
      : props.device.state === 'offline'
        ? '以下为离线前最后一次示例快照，不代表设备当前状态。'
        : '以下为演示数据。奖励机在扭蛋成功后自动出货奖励，不涉及支付。'
  )
  const panels = [
    {
      name: '3D 打印机',
      icon: 'ri:printer-line',
      type: 'primary' as const,
      status: '打印中',
      description: '文物模型与学生文创作品 · 封闭式 PLA 打印单元',
      stats: [
        { label: '今日完成', value: '6 件' },
        { label: '累计完成', value: '128 件' },
        { label: '今日耗材', value: '108 g' },
        { label: '今日失败', value: '1 次' }
      ],
      taskLabel: '当前打印进度',
      task: '青铜鼎 · 文创缩小模型',
      progress: 64,
      taskNote: '已打印 128 / 200 层 · 预计剩余 28 分钟 · 另有 1 项任务待教师确认',
      states: [
        { label: '喷嘴 / 热床温度', value: '205°C / 55°C' },
        { label: '机柜门 / 安全联锁', value: '已关闭 / 已启用' },
        { label: '急停 / 散热风扇', value: '未触发 / 正常' },
        { label: '耗材检测 / 进料', value: '有料 / 正常' },
        { label: '最近维护', value: '示例 · 09-08 清洁喷嘴与平台' }
      ],
      stockTitle: '打印材料',
      stockSummary: '2 卷 · 剩余 700 g',
      stock: [
        { name: 'PLA 米白 · 使用中', remaining: '620 g', status: '充足', warning: false },
        { name: 'PLA 青铜色 · 备用', remaining: '80 g', status: '余量偏低', warning: true }
      ],
      warning: '备用青铜色 PLA 仅剩 80 g，低于 100 g 提醒线，请及时补充。'
    },
    {
      name: '扭蛋奖励售货机',
      icon: 'ri:gift-line',
      type: 'warning' as const,
      status: '待补货',
      description: '扭蛋成功 → 生成奖励任务 → 自动出货 → 掉落确认',
      stats: [
        { label: '今日扭蛋成功', value: '18 次' },
        { label: '今日已出货', value: '16 件' },
        { label: '待出货', value: '1 件' },
        { label: '出货异常', value: '1 件' }
      ],
      taskLabel: '奖励库存余量',
      task: '42 / 80 件',
      progress: 52.5,
      taskNote: '累计出货 386 件 · 今日 18 项奖励任务：16 项完成、1 项排队、1 项异常待处理',
      states: [
        { label: '出货电机 / 掉落传感器', value: '待机 / 正常' },
        { label: '柜门 / 取货口', value: '已关闭 / 无遮挡' },
        { label: '货道状态', value: '4 个货道 · 3 个有货 · 1 个缺货' },
        { label: '最近出货', value: '示例 · 10:28 文物徽章，已确认掉落' },
        { label: '异常奖励任务', value: 'REWARD-DEMO-017 · 掉落确认超时，待核查' }
      ],
      stockTitle: '奖励货道库存',
      stockSummary: '每货道容量 20 件',
      stock: [
        { name: 'A1 · 文物徽章', remaining: '20 件', status: '充足', warning: false },
        { name: 'A2 · 文化贴纸', remaining: '18 件', status: '充足', warning: false },
        { name: 'A3 · 文创书签', remaining: '4 件', status: '库存偏低', warning: true },
        { name: 'A4 · 迷你文物模型', remaining: '0 件', status: '缺货', warning: true }
      ],
      warning: 'A3 库存低于 5 件，A4 已缺货；1 项任务掉落确认超时，请核查实物与任务记录。'
    }
  ]
</script>

<style scoped lang="scss">
  .hardware-row {
    row-gap: 10px;
    margin-top: 16px;
    margin-bottom: 24px;
  }

  .hardware-card {
    height: 100%;
    padding: 20px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }

  header,
  header > div,
  .section-heading {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }

  header > div {
    justify-content: flex-start;
  }

  header :deep(.art-svg-icon) {
    font-size: 24px;
    color: var(--el-color-primary);
  }

  h3 {
    margin: 0;
    font-size: 17px;
  }

  h4 {
    margin: 16px 0 12px;
    font-size: 14px;
  }

  .description,
  .task p {
    font-size: 12px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .stat-row {
    row-gap: 10px;
    margin: 16px 0;
  }

  .stat {
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  .stat span {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .stat strong {
    display: block;
    margin-top: 8px;
    font-size: 22px;
    font-weight: 500;
  }

  .task {
    padding: 0 12px 4px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .section-heading {
    flex-wrap: wrap;
    font-size: 12px;
  }

  .inventory-heading {
    margin-top: 8px;
  }

  .warning {
    margin-top: 16px;
  }

  @media (width <= 767px) {
    .hardware-card {
      padding: 14px;
    }
  }
</style>
