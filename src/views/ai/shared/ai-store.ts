import { reactive, watch } from 'vue'
import type { LlmModel } from '../llm/types'
import cover1 from '@/assets/images/cover/img1.webp'
import avatar1 from '@/assets/images/avatar/avatar1.webp'
import avatar2 from '@/assets/images/avatar/avatar2.webp'
import avatar3 from '@/assets/images/avatar/avatar3.webp'
export type Kind = 'knowledge' | 'prompt' | 'script' | 'digital'
export type ConfigRow = Record<string, any> & {
  id: number
  name: string
  status: 'enabled' | 'disabled'
  updatedAt: string
}
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
export const scriptEvents = [
  { key: 'welcome', label: '首次进入', category: '欢迎语' },
  { key: 'noAnswer', label: '未找到可靠资料', category: '无知识兜底' },
  { key: 'timeout', label: '请求超时', category: '请求超时' },
  { key: 'offline', label: '网络断开', category: '网络断开' },
  { key: 'serviceError', label: '服务异常', category: '服务异常兜底' },
  { key: 'sensitive', label: '敏感问题', category: '敏感问题兜底' }
]
export interface Release {
  version: number
  at: string
  note: string
  config: Record<string, any>
  resolved: Record<string, any>
}
const at = '2026-09-11 10:30:00'
const seeds: Record<Kind, ConfigRow[]> = {
  knowledge: [
    {
      id: 1,
      name: '古代中国知识库',
      theme: '古代中国',
      embedding: 'text-embedding-3-small',
      documents: 126,
      chunks: 2380,
      chunkSize: 800,
      overlap: 120,
      status: 'enabled',
      updatedAt: at,
      remark: '学生端默认知识来源'
    },
    {
      id: 2,
      name: '青铜文明知识库',
      theme: '青铜文明',
      embedding: 'bge-m3',
      documents: 48,
      chunks: 912,
      chunkSize: 600,
      overlap: 100,
      status: 'enabled',
      updatedAt: '2026-09-09 15:20:00',
      remark: '青铜器专题资料'
    },
    {
      id: 3,
      name: '瓷器艺术草稿库',
      theme: '瓷器艺术',
      embedding: 'bge-m3',
      documents: 15,
      chunks: 206,
      chunkSize: 600,
      overlap: 80,
      status: 'disabled',
      updatedAt: '2026-09-08 09:10:00',
      remark: '等待内容审核'
    }
  ],
  prompt: [
    {
      id: 1,
      name: '学生问答系统提示词',
      scene: '知识问答',
      version: 'V1.2',
      variables: 'question, context, ageGroup',
      content:
        '你是面向学生的博物馆数字讲解员。请仅根据 context 回答 question，资料不足时不得猜测。',
      status: 'enabled',
      updatedAt: at,
      remark: '生产使用版本'
    },
    {
      id: 2,
      name: '文物讲解提示词',
      scene: '文物讲解',
      version: 'V1.0',
      variables: 'artifact, context',
      content: '根据资料，用生动准确的语言介绍文物，并给出一个思考问题。',
      status: 'enabled',
      updatedAt: '2026-09-10 16:00:00',
      remark: ''
    },
    {
      id: 3,
      name: '回答安全审核',
      scene: '安全审核',
      version: 'V0.8',
      variables: 'answer, ageGroup',
      content: '检查回答是否准确、安全且适龄。',
      status: 'disabled',
      updatedAt: '2026-09-06 11:20:00',
      remark: '测试中'
    }
  ],
  script: [
    {
      id: 1,
      name: '通用欢迎语',
      category: '欢迎语',
      digitalHuman: '全部数字人',
      content: '你好，我是你的数字讲解员。今天想了解哪一件文物呢？',
      trigger: '进入数字人页面后首次播放',
      status: 'enabled',
      updatedAt: at,
      remark: ''
    },
    {
      id: 2,
      name: '无知识兜底',
      category: '无知识兜底',
      digitalHuman: '全部数字人',
      content: '这个问题我暂时没有找到可靠资料。你可以换个问法，或者选择一个推荐问题。',
      trigger: '检索结果低于可信阈值时',
      status: 'enabled',
      updatedAt: '2026-09-10 13:40:00',
      remark: '禁止自行补充事实'
    },
    {
      id: 3,
      name: '服务繁忙兜底',
      category: '服务异常兜底',
      digitalHuman: '全部数字人',
      content: '我现在需要休息一下，请稍后再试。',
      trigger: '模型超时或服务不可用时',
      status: 'enabled',
      updatedAt: '2026-09-09 18:05:00',
      remark: ''
    }
  ],
  digital: [
    {
      id: 1,
      name: '央央',
      avatar: avatar1,
      role: '博物馆讲解员',
      knowledge: '古代中国知识库',
      prompt: '学生问答 V1.2',
      welcome: '通用欢迎语',
      sessions: 1286,
      description: '亲切、活泼的校园博物馆数字讲解员。',
      status: 'enabled',
      updatedAt: at,
      remark: '默认数字人'
    },
    {
      id: 2,
      name: '文博老师',
      avatar: avatar2,
      role: '课堂助教',
      knowledge: '青铜文明知识库',
      prompt: '文物讲解 V1.0',
      welcome: '青铜主题欢迎语',
      sessions: 368,
      description: '沉稳专业，适用于课堂专题讲解。',
      status: 'enabled',
      updatedAt: '2026-09-10 09:20:00',
      remark: ''
    },
    {
      id: 3,
      name: '青铜小使者',
      avatar: avatar3,
      role: '历史人物',
      knowledge: '青铜文明知识库',
      prompt: '学生问答 V1.2',
      welcome: '青铜主题欢迎语',
      sessions: 0,
      description: '青铜文明专题角色，形象资产制作中。',
      status: 'disabled',
      updatedAt: '2026-09-08 14:00:00',
      remark: '未发布'
    }
  ]
}
const initialModels: LlmModel[] = [
  {
    id: 1,
    name: 'OpenAI GPT-4.1',
    model: 'gpt-4.1',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-demo-openai',
    maxTokens: 32768,
    temperature: 0.7,
    topP: 1,
    timeout: 60,
    stream: true,
    isDefault: true,
    status: 'enabled',
    remark: '默认文本对话模型',
    createdAt: '2026-08-21 10:00:00',
    updatedAt: '2026-09-01 16:20:00'
  },
  {
    id: 2,
    name: 'DeepSeek Chat',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-demo-deepseek',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 1,
    timeout: 60,
    stream: true,
    isDefault: false,
    status: 'enabled',
    remark: 'OpenAI Compatible 对话模型',
    createdAt: '2026-08-22 14:30:00',
    updatedAt: '2026-08-29 09:45:00'
  },
  {
    id: 3,
    name: '本地 Qwen',
    model: 'qwen2.5:14b',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
    maxTokens: 8192,
    temperature: 0.6,
    topP: 0.9,
    timeout: 120,
    stream: true,
    isDefault: false,
    status: 'disabled',
    remark: '通过 OpenAI Compatible 接口调用本地模型',
    createdAt: '2026-08-25 11:15:00',
    updatedAt: '2026-08-28 18:10:00'
  }
]

for (const row of seeds.prompt) {
  row.content =
    row.id === 1
      ? '你是面向{{ageGroup}}的博物馆讲解员。仅根据{{context}}回答{{question}}，资料不足时说明无法确认。'
      : row.id === 2
        ? '根据{{context}}介绍{{artifact}}，语言准确、生动。'
        : '检查{{answer}}是否准确、安全且适合{{ageGroup}}。'
  row.variableDefs = (row.content.match(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g) || []).map(
    (v: string) => ({
      name: v.replace(/[{}\s]/g, ''),
      required: true,
      description: '',
      defaultValue: '',
      testValue: ''
    })
  )
  row.releases = [
    {
      version: 1,
      at: row.updatedAt,
      note: '初始示例版本',
      config: { content: row.content, variableDefs: clone(row.variableDefs), scene: row.scene },
      resolved: {}
    }
  ]
  row.version = 'V1'
  row.publishedVersion = 1
}
for (const event of scriptEvents) {
  let row = seeds.script.find((r) => r.category === event.category)
  if (!row) {
    row = {
      id: Math.max(...seeds.script.map((r) => r.id)) + 1,
      name: event.label + '提示',
      category: event.category,
      status: 'enabled',
      updatedAt: at,
      content:
        event.key === 'offline'
          ? '当前网络已断开，请检查网络后重试。'
          : event.key === 'timeout'
            ? '等待回答超时，请稍后重试。'
            : '这个问题暂时无法回答，可以换个话题。'
    }
    seeds.script.push(row)
  }
  Object.assign(row, {
    event: event.key,
    scope: 'global',
    digitalId: undefined,
    spokenContent: '',
    action: event.key === 'welcome' ? 'none' : 'retry'
  })
}
for (const row of seeds.digital)
  Object.assign(row, {
    modelId: 1,
    knowledgeIds: row.id === 1 ? [1] : [2],
    promptId: row.id === 2 ? 2 : 1,
    promptVersion: 1,
    ageGroup: '小学高年级',
    answerLength: '适中',
    scripts: {},
    releases: [],
    publishedVersion: 0,
    changeNote: ''
  })
export type KnowledgeResource = {
  id: number
  name: string
  type: string
  directory: string
  size: string
  status?: 'enabled' | 'disabled'
  parseStatus: string
  chunks: number
  createdAt?: string
  updatedAt: string
  parsedAt?: string
  content: string
  preview?: string
  tags?: string
  localFile?: boolean
  spreadsheetData?: Record<string, unknown>[]
}
const initialResources: KnowledgeResource[] = [
  {
    id: 1,
    name: '古代中国通史导读.txt',
    type: 'text',
    directory: 'overview',
    size: '18 KB',
    parseStatus: '已完成',
    chunks: 24,
    updatedAt: '2026-09-11 09:20',
    content: '古代中国展览以王朝更替和文明发展为线索，展示中华文明绵延不断的发展历程。',
    tags: '历史,通史'
  },
  {
    id: 2,
    name: '青铜器知识手册.docx',
    type: 'document',
    directory: 'bronze',
    size: '2.6 MB',
    parseStatus: '已完成',
    chunks: 86,
    updatedAt: '2026-09-10 16:32',
    content: '已提取文档正文、标题层级和图片说明。',
    tags: '青铜器'
  },
  {
    id: 3,
    name: '文物讲解审核稿.pdf',
    type: 'pdf',
    directory: 'review',
    size: '8.4 MB',
    parseStatus: '已完成',
    chunks: 132,
    updatedAt: '2026-09-10 14:05',
    content: 'PDF 共 56 页，已完成版面解析。',
    tags: '审核资料'
  },
  {
    id: 4,
    name: '后母戊鼎.jpg',
    type: 'image',
    directory: 'bronze',
    size: '3.1 MB',
    parseStatus: '已完成',
    chunks: 3,
    updatedAt: '2026-09-09 11:18',
    preview: cover1,
    content: 'OCR 与图片描述：后母戊鼎器形厚重，纹饰精美。',
    tags: '藏品,图片'
  },
  {
    id: 5,
    name: '青铜文明宣传片.mp4',
    type: 'video',
    directory: 'media',
    size: '126 MB · 04:32',
    parseStatus: '解析中',
    chunks: 0,
    updatedAt: '2026-09-09 10:20',
    content: '正在提取音轨、字幕和关键帧。',
    tags: '视频'
  },
  {
    id: 6,
    name: '讲解员示范音频.mp3',
    type: 'audio',
    directory: 'media',
    size: '12 MB · 06:10',
    parseStatus: '解析失败',
    chunks: 0,
    updatedAt: '2026-09-08 17:42',
    content: '音轨编码暂不支持，请转为 MP3/AAC 后重试。',
    tags: '音频'
  },
  {
    id: 7,
    name: '展览资料附件.zip',
    type: 'file',
    directory: 'attachments',
    size: '48 MB',
    parseStatus: '不参与解析',
    chunks: 0,
    updatedAt: '2026-09-08 15:30',
    content: '附件仅供下载，不参与知识检索。',
    tags: '附件'
  },
  {
    id: 8,
    name: '藏品基础数据.xlsx',
    type: 'spreadsheet',
    directory: 'overview',
    size: '680 KB',
    parseStatus: '已完成',
    chunks: 52,
    updatedAt: '2026-09-08 13:10',
    content: 'Excel 共 126 行藏品数据。',
    tags: '表格,藏品'
  },
  {
    id: 9,
    name: '学生讲解规范.md',
    type: 'markdown',
    directory: 'review',
    size: '12 KB',
    parseStatus: '已完成',
    chunks: 18,
    updatedAt: '2026-09-08 12:00',
    content: '# 学生讲解规范\n\n回答应当**准确、友好、适龄**，并且只引用已审核的知识资料。',
    tags: '规范,Markdown'
  }
]
export const initialDirectories: {
  id: string
  label: string
  children?: { id: string; label: string }[]
}[] = [
  {
    id: 'all',
    label: '全部资源',
    children: [
      { id: 'overview', label: '基础资料' },
      { id: 'bronze', label: '青铜文明' },
      { id: 'review', label: '审核资料' },
      { id: 'media', label: '音视频素材' },
      { id: 'attachments', label: '附件' }
    ]
  }
]
for (const resource of initialResources)
  Object.assign(resource, {
    status: resource.type === 'file' ? 'disabled' : 'enabled',
    createdAt: resource.updatedAt,
    parsedAt: resource.parseStatus === '已完成' ? resource.updatedAt : '-'
  })
const initial = {
  ...seeds,
  models: initialModels.map((m) => ({
    ...m,
    purpose: 'chat',
    provider: 'OpenAI Compatible',
    apiKeyConfigured: true
  })),
  tags: [
    { id: 1, name: '青铜器', color: '#2563eb', remark: '青铜专题' },
    { id: 2, name: '学生适读', color: '#9333ea', remark: '适读内容分类' },
    { id: 3, name: '历史', color: '#16a34a', remark: '' }
  ],
  resourcesByBase: {
    '1': clone(initialResources),
    '2': clone(initialResources.filter((r) => r.directory === 'bronze')),
    '3': []
  } as Record<string, KnowledgeResource[]>,
  directoriesByBase: {} as Record<string, any[]>
}
initial.models.push({
  ...initial.models[0],
  id: 4,
  name: '知识向量模型',
  model: 'text-embedding-3-small',
  purpose: 'embedding',
  isDefault: true
})
for (const row of initial.knowledge) row.embeddingId = 4
const storageKey = 'museum-ai-admin-design-v1'
let saved: Partial<typeof initial> = {}
try {
  const raw = localStorage.getItem(storageKey)
  if (raw) saved = JSON.parse(raw)
} catch {
  /* local preview can run without storage */
}
export const aiState = reactive({ ...initial, ...saved })
for (const resource of Object.values(aiState.resourcesByBase).flat())
  for (const name of resource.tags?.split(',').filter(Boolean) || [])
    if (!aiState.tags.some((t) => t.name === name))
      aiState.tags.push({
        id: Math.max(0, ...aiState.tags.map((t) => t.id)) + 1,
        name,
        color: '#409eff',
        remark: ''
      })
watch(
  aiState,
  (state) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(state, (key, value) =>
          key === 'apiKey'
            ? undefined
            : typeof value === 'string' && value.startsWith('blob:')
              ? ''
              : value
        )
      )
    } catch {
      /* quota/private mode: keep current session */
    }
  },
  { deep: true }
)
export function promptRelease(id: number, version?: number) {
  const prompt = aiState.prompt.find((p) => p.id === id)
  return prompt?.releases?.find(
    (r: Release) => r.version === (version || prompt.publishedVersion)
  ) as Release | undefined
}
export function resolveScript(digital: Record<string, any>, event: string): ConfigRow | undefined {
  const explicit = digital.scripts?.[event]
  if (explicit)
    return aiState.script.find(
      (s) =>
        s.id === explicit &&
        s.status === 'enabled' &&
        s.event === event &&
        (s.scope === 'global' || s.digitalId === digital.id)
    )
  return (
    aiState.script.find(
      (s) =>
        s.status === 'enabled' &&
        s.event === event &&
        s.scope === 'digital' &&
        s.digitalId === digital.id
    ) ||
    aiState.script.find((s) => s.status === 'enabled' && s.event === event && s.scope === 'global')
  )
}
export function digitalIssues(digital: Record<string, any>): string[] {
  const issues: string[] = []
  if (digital.archived) issues.push('归档数字人需先恢复后发布')
  if (!digital.name?.trim()) issues.push('填写数字人名称')
  if (!digital.role) issues.push('选择角色类型')
  const selectedModel = aiState.models.find((m) => m.id === digital.modelId)
  if (
    selectedModel &&
    (!selectedModel.model?.trim() || !/^https?:\/\//.test(selectedModel.baseUrl))
  )
    issues.push('模型标识或服务地址无效')
  if (
    !aiState.models.some(
      (m) => m.id === digital.modelId && m.status === 'enabled' && m.purpose === 'chat'
    )
  )
    issues.push('选择已启用的对话模型')
  if (!digital.knowledgeIds?.length) issues.push('至少绑定一个知识库')
  for (const id of digital.knowledgeIds || [])
    if (!aiState.knowledge.some((k) => k.id === id && k.status === 'enabled'))
      issues.push('绑定的知识库不存在或已停用')
  if (
    !aiState.prompt.some((p) => p.id === digital.promptId && p.status === 'enabled') ||
    !promptRelease(digital.promptId, digital.promptVersion)
  )
    issues.push('选择已发布且启用的提示词版本')
  for (const event of scriptEvents)
    if (!resolveScript(digital, event.key)) issues.push('缺少有效话术：' + event.label)
  return issues
}
export function digitalConfig(row: Record<string, any>) {
  const keys = [
    'id',
    'name',
    'avatar',
    'role',
    'description',
    'modelId',
    'knowledgeIds',
    'promptId',
    'promptVersion',
    'ageGroup',
    'answerLength',
    'scripts',
    'remark'
  ]
  return Object.fromEntries(keys.map((key) => [key, clone(row[key] ?? null)]))
}
export function digitalDependencies(row: Record<string, any>): Record<string, any> {
  const model = clone(aiState.models.find((m) => m.id === row.modelId) || {}) as Record<string, any>
  delete model.apiKey
  return {
    model,
    prompt: clone(promptRelease(row.promptId, row.promptVersion) || null),
    knowledge: clone(aiState.knowledge.filter((k) => (row.knowledgeIds || []).includes(k.id))),
    scripts: Object.fromEntries(
      scriptEvents.map((e) => [e.key, clone(resolveScript(row, e.key) || null)])
    )
  }
}
export function publishDigital(row: ConfigRow, note: string): Release {
  const issues = digitalIssues(row)
  if (issues.length) throw new Error(issues.join('；'))
  const release: Release = {
    version: Math.max(0, ...(row.releases || []).map((r: Release) => r.version)) + 1,
    at: new Date().toISOString(),
    note: note.trim() || '发布配置',
    config: digitalConfig(row),
    resolved: digitalDependencies(row)
  }
  row.releases ??= []
  row.releases.unshift(release)
  row.publishedVersion = release.version
  row.updatedAt = release.at
  return release
}
export function references(kind: string, id: number): string[] {
  const refs: string[] = []
  for (const digital of aiState.digital) {
    const configs = [
      digital,
      ...(digital.releases || [])
        .filter((r: Release) => r.version === digital.publishedVersion)
        .map((r: Release) => r.config)
    ]
    const matches = configs.some((c) =>
      kind === 'model'
        ? c.modelId === id
        : kind === 'knowledge'
          ? c.knowledgeIds?.includes(id)
          : kind === 'prompt'
            ? c.promptId === id
            : Object.values(c.scripts || {}).includes(id)
    )
    const inherited =
      kind === 'script' &&
      (scriptEvents.some((e) => resolveScript(digital, e.key)?.id === id) ||
        (digital.releases || []).some(
          (r: Release) =>
            r.version === digital.publishedVersion &&
            Object.values(r.resolved.scripts || {}).some((v: any) => v?.id === id)
        ))
    if (matches || inherited) refs.push(digital.name)
  }
  if (kind === 'model')
    for (const base of aiState.knowledge)
      if (base.embeddingId === id) refs.push('知识库：' + base.name)
  return [...new Set(refs)]
}
