<template>
  <section class="ai-monitor">
    <ElAlert
      :title="
        available
          ? device.state === 'offline'
            ? '设备已离线，以下为历史模拟请求。'
            : '以下为独立调优样本，图表由下方全部样本统计，不代表今日全部调用。问题、回答及引用内容均为演示。'
          : '等待接入 AI 请求日志，暂无调用趋势或问答记录。'
      "
      type="info"
      :closable="false"
      show-icon
    />
    <ElRow :gutter="10" class="charts">
      <ElCol v-for="item in tuningStats" :key="item.label" :xs="12" :sm="12" :md="6" :lg="6" :xl="6"
        ><div class="tuning-stat"
          ><span>{{ item.label }}</span
          ><strong>{{ available ? item.value : '—' }}</strong
          ><small>{{ available ? item.note : '等待日志上报' }}</small></div
        ></ElCol
      >
      <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
        ><ElCard shadow="never"
          ><h3>请求结果分布 · 次</h3
          ><ArtLineChart
            v-if="available"
            :data="requestSeries"
            :x-axis-data="times"
            :show-legend="true"
            height="240px" /><ElEmpty v-else description="暂无请求数据" /></ElCard
      ></ElCol>
      <ElCol :xs="24" :sm="24" :md="12" :lg="12" :xl="12"
        ><ElCard shadow="never"
          ><h3>请求耗时 · ms</h3
          ><ArtLineChart
            v-if="available"
            :data="latencySeries"
            :x-axis-data="times"
            :show-legend="true"
            height="240px" /><ElEmpty v-else description="暂无耗时数据" /></ElCard
      ></ElCol>
      <ElCol :span="24">
        <ElCard shadow="never" class="token-card">
          <div class="token-heading"
            ><div
              ><h3>Token 使用情况 · 每次请求</h3
              ><p>输入包含系统提示、对话上下文和检索片段；输出为模型生成内容。</p></div
            ><ElTag type="info">演示用量</ElTag></div
          >
          <ElRow :gutter="10" class="token-summary">
            <ElCol
              v-for="item in tokenStats"
              :key="item.label"
              :xs="12"
              :sm="6"
              :md="6"
              :lg="6"
              :xl="6"
              ><div
                ><span>{{ item.label }}</span
                ><strong>{{ available ? item.value : '—' }}</strong></div
              ></ElCol
            >
          </ElRow>
          <ArtLineChart
            v-if="available"
            :data="tokenSeries"
            :x-axis-data="times"
            :show-legend="true"
            :smooth="false"
            height="260px"
          />
          <ElEmpty v-else description="暂无 Token 使用数据" />
          <p class="chart-note"
            >失败且未返回 Token 用量的请求在图中记为 0，仅用于保持请求时间轴完整。</p
          >
        </ElCard>
      </ElCol>
    </ElRow>
    <ElCard shadow="never">
      <div class="toolbar"
        ><h3
          >请求记录 <small>{{ filtered.length }} 条</small></h3
        ><div class="filters"
          ><ElButton :disabled="!filtered.length" @click="exportRecords"
            ><ArtSvgIcon icon="ri:download-line" />导出调优记录</ElButton
          ><ElInput
            v-model="keyword"
            clearable
            placeholder="搜索请求 ID、问题、回答、知识库"
            aria-label="搜索请求记录" /><ElSelect v-model="status" aria-label="请求状态"
            ><ElOption label="全部状态" value="all" /><ElOption
              label="成功"
              value="success" /><ElOption label="失败" value="failed" /></ElSelect></div
      ></div>
      <ElTable
        :data="filtered"
        row-key="id"
        empty-text="暂无匹配的请求记录"
        :expand-row-keys="expanded"
        @expand-change="onExpand"
      >
        <ElTableColumn type="expand"
          ><template #default="{ row }"
            ><div class="request-detail">
              <ElDescriptions :column="1" border size="small"
                ><ElDescriptionsItem label="请求 ID">{{ row.id }}</ElDescriptionsItem
                ><ElDescriptionsItem label="模型 / 提示词版本"
                  >museum-assistant-demo / prompt-v3</ElDescriptionsItem
                ><ElDescriptionsItem label="耗时分解"
                  >检索 {{ row.retrieval }} ms · 生成 {{ row.total - row.retrieval }} ms · 总计
                  {{ row.total }} ms</ElDescriptionsItem
                ><ElDescriptionsItem label="Token 用量">{{
                  row.tokens === null
                    ? '失败请求未返回用量'
                    : `输入 ${row.tokens[0]} / 输出 ${row.tokens[1]}`
                }}</ElDescriptionsItem></ElDescriptions
              >
              <h4>问题</h4><p class="text-block">{{ row.question }}</p
              ><h4>回答</h4><p class="text-block">{{ row.answer || '未生成回答' }}</p>
              <ElAlert
                v-if="row.error"
                :title="row.error"
                type="error"
                :closable="false"
                show-icon
              />
              <h4>引用知识库与片段</h4
              ><ElEmpty v-if="!row.sources.length" description="未引用知识库" :image-size="48" />
              <div v-for="source in row.sources" :key="source.chunk" class="citation"
                ><div class="toolbar"
                  ><strong>{{ source.kb }} / {{ source.document }}</strong
                  ><ElTag size="small">{{ source.used ? '已引用' : '已检索 · 未引用' }}</ElTag></div
                ><small
                  >{{ source.chunk }} · 版本 {{ source.version }} · 检索相似度
                  {{ source.score }}（非答案正确率）</small
                ><p>{{ source.text }}</p></div
              >
            </div></template
          ></ElTableColumn
        >
        <ElTableColumn prop="time" label="请求时间（示例）" width="165" /><ElTableColumn
          prop="id"
          label="请求 ID"
          width="155"
        />
        <ElTableColumn
          prop="question"
          label="问题"
          min-width="210"
          show-overflow-tooltip
        /><ElTableColumn prop="answer" label="回答" min-width="240" show-overflow-tooltip />
        <ElTableColumn label="知识库" min-width="160"
          ><template #default="{ row }">{{
            row.sources.map((s: Source) => s.kb).join('、') || '无命中'
          }}</template></ElTableColumn
        >
        <ElTableColumn label="耗时" width="100"
          ><template #default="{ row }">{{ row.total }} ms</template></ElTableColumn
        >
        <ElTableColumn label="状态" width="90"
          ><template #default="{ row }"
            ><ElTag :type="row.status === 'success' ? 'success' : 'danger'">{{
              row.status === 'success' ? '成功' : '失败'
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="100" fixed="right"
          ><template #default="{ row }"
            ><ElButton
              link
              type="primary"
              @click="expanded = expanded.includes(row.id) ? [] : [row.id]"
              >{{ expanded.includes(row.id) ? '收起' : '查看详情' }}</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>
  </section>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'
  const props = defineProps<{ device: { id: number; realDevice?: boolean; state: string } }>()
  const available = computed(() => !props.device.realDevice && props.device.state !== 'unknown')
  type Source = {
    kb: string
    document: string
    chunk: string
    version: string
    score: number
    text: string
    used: boolean
  }
  type Request = {
    id: string
    time: string
    question: string
    answer: string
    status: string
    total: number
    retrieval: number
    tokens: number[] | null
    sources: Source[]
    error?: string
  }
  const source: Source = {
    kb: '文物教学知识库（示例）',
    document: '文物观察入门',
    chunk: 'CHUNK-DEMO-01',
    version: 'v1.2',
    score: 0.91,
    text: '观察文物时，可从外形、纹样、材料和用途提出问题，并区分观察结果与推测。',
    used: true
  }
  const samples: Request[] = [
    {
      id: 'AI-DEMO-001',
      time: '09-09 10:05',
      question: '怎样引导学生观察一件文物？',
      answer: '可以先观察外形、纹样和材料，再讨论用途。请学生说出观察依据，并把推测与事实分开。[1]',
      status: 'success',
      total: 1250,
      retrieval: 180,
      tokens: [320, 86],
      sources: [{ ...source }]
    },
    {
      id: 'AI-DEMO-002',
      time: '09-09 10:10',
      question: '给我一个文物观察课堂活动。',
      answer: '让学生选择一个细节，画下来并描述，再小组讨论“看到了什么”和“猜测是什么”。[1]',
      status: 'success',
      total: 1580,
      retrieval: 220,
      tokens: [410, 105],
      sources: [{ ...source, score: 0.87 }]
    },
    {
      id: 'AI-DEMO-003',
      time: '09-09 10:15',
      question: '这件展品的具体出土日期是什么？',
      answer: '当前知识库没有找到可核实的具体日期，请查阅展品说明或向老师确认。',
      status: 'success',
      total: 980,
      retrieval: 160,
      tokens: [210, 42],
      sources: []
    },
    {
      id: 'AI-DEMO-004',
      time: '09-09 10:20',
      question: '帮我生成一份文物观察教案。',
      answer: '',
      status: 'failed',
      total: 10000,
      retrieval: 190,
      tokens: null,
      sources: [{ ...source, used: false }],
      error: 'MODEL_TIMEOUT · 模型生成超时，未返回答案。'
    }
  ]
  const keyword = ref(''),
    status = ref('all'),
    expanded = ref<string[]>([])
  const logs = computed(() => (available.value ? samples : []))
  const filtered = computed(() =>
    logs.value.filter(
      (row) =>
        (status.value === 'all' || row.status === status.value) &&
        `${row.id} ${row.question} ${row.answer} ${row.sources.map((s) => `${s.kb} ${s.document}`).join(' ')}`
          .toLowerCase()
          .includes(keyword.value.trim().toLowerCase())
    )
  )
  const times = samples.map((row) => row.time.split(' ')[1])
  const requestSeries = computed(() =>
    ['success', 'failed'].map((state) => ({
      name: state === 'success' ? '成功' : '失败',
      data: logs.value.map((row) => (row.status === state ? 1 : 0))
    }))
  )
  const latencySeries = computed(() => [
    { name: '请求总耗时（含超时）', data: logs.value.map((row) => row.total) },
    { name: '知识检索耗时', data: logs.value.map((row) => row.retrieval) }
  ])
  const tokenSeries = computed(() => [
    { name: '输入 Token', data: logs.value.map((row) => row.tokens?.[0] ?? 0) },
    { name: '输出 Token', data: logs.value.map((row) => row.tokens?.[1] ?? 0) },
    {
      name: '总 Token',
      data: logs.value.map((row) => (row.tokens ? row.tokens[0] + row.tokens[1] : 0))
    }
  ])
  const tokenStats = computed(() => {
    const measured = samples.filter((row) => row.tokens !== null)
    const input = measured.reduce((sum, row) => sum + (row.tokens?.[0] ?? 0), 0)
    const output = measured.reduce((sum, row) => sum + (row.tokens?.[1] ?? 0), 0)
    return [
      { label: '累计输入', value: `${input} Token` },
      { label: '累计输出', value: `${output} Token` },
      { label: '累计总量', value: `${input + output} Token` },
      { label: '平均每次', value: `${Math.round((input + output) / measured.length)} Token` }
    ]
  })
  const tuningStats = computed(() => {
    const success = samples.filter((row) => row.status === 'success')
    const noHit = success.filter((row) => !row.sources.length).length
    return [
      {
        label: '平均响应耗时',
        value: `${Math.round(samples.reduce((sum, row) => sum + row.total, 0) / samples.length)} ms`,
        note: '包含超时请求'
      },
      {
        label: '请求失败率',
        value: `${Math.round((samples.filter((row) => row.status === 'failed').length / samples.length) * 100)}%`,
        note: '失败 / 全部样本'
      },
      {
        label: '知识库无命中率',
        value: `${Math.round((noHit / success.length) * 100)}%`,
        note: '成功回答中的无引用样本'
      },
      { label: '用户满意度', value: '67%', note: '2 个有帮助 / 3 个已反馈' }
    ]
  })
  function exportRecords() {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = filtered.value.map((row) =>
      [
        row.id,
        row.time,
        row.status,
        row.question,
        row.answer,
        row.sources.map((item) => item.kb).join('、'),
        row.total
      ]
        .map(escape)
        .join(',')
    )
    const csv = ['请求ID,时间,状态,问题,回答,引用知识库,总耗时ms', ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-tuning-${props.device.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  function onExpand(_row: Request, rows: Request[]) {
    expanded.value = rows.map((row) => row.id)
  }
  watch(
    () => props.device.id,
    () => {
      keyword.value = ''
      status.value = 'all'
      expanded.value = []
    }
  )
</script>
<style scoped lang="scss">
  .ai-monitor {
    margin-bottom: 24px;
  }

  .charts {
    row-gap: 10px;
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .tuning-stat {
    height: 100%;
    padding: 16px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
  }

  .tuning-stat span,
  .tuning-stat small {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .tuning-stat strong {
    display: block;
    margin: 8px 0;
    font-size: 24px;
    font-weight: 500;
  }

  .token-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .token-heading p,
  .chart-note {
    font-size: 12px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .token-summary {
    row-gap: 10px;
    margin: 14px 0 4px;
  }

  .token-summary > .el-col > div {
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .token-summary span {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .token-summary strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
    font-weight: 500;
  }

  .chart-note {
    margin: 6px 0 0;
  }

  h3 {
    margin: 0 0 14px;
    font-size: 15px;
  }

  h4 {
    margin: 18px 0 8px;
  }

  small {
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .toolbar h3 {
    margin: 0;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .filters .el-input {
    width: 280px;
    max-width: 100%;
  }

  .filters .el-select {
    width: 130px;
  }

  .request-detail {
    padding: 16px 24px;
  }

  .text-block {
    padding: 12px;
    line-height: 1.8;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .citation {
    padding: 14px;
    margin-bottom: 10px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
  }

  .citation p {
    line-height: 1.8;
  }
</style>
