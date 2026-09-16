import { reactive, watch } from 'vue'
import { aiState, clone, promptRelease, referenceProviders, scriptEvents } from './ai-store'
import defaultGuideAvatar from '@/assets/images/avatar/avatar1.webp'

export interface Scene {
  digitalIds: string[]
  defaultDigitalId: string
  id: string
  name: string
  description: string
  form: string
  modelId: number
  knowledgeIds: number[]
  promptId: number
  promptVersion: number
  templateId: string
  external: boolean
  sourceIds: string[]
  idleMinutes: number
  historyTurns: number
  resume: boolean
  interrupt: boolean
  image: boolean
  video: boolean
  scripts: Record<string, number>
}
export interface Narration {
  id: string
  kind: string
  name: string
  knowledgeId: number
  facts: string
  source: string
  templateId: string
  text: string
  questions: string
  reviewed: boolean
}
export interface GuideRelease {
  configuration?: GuideConfiguration
  dependencies?: Record<string, unknown>
  id: string
  guideId: string
  version: number
  at: string
  note: string
  scope: 'all' | 'schools'
  schools: { id: string; name: string }[]
  snapshot: {
    avatar?: string
    id: string
    enabled: boolean
    name: string
    role: string
    voice: string
    rate: number
    full: string
    half: string
    sprite: string
  }
}
export interface GuideConfiguration {
  scenes: Scene[]
  templates: { id: string; name: string; content: string }[]
  sources: { id: string; name: string; url: string; enabled: boolean }[]
  narrations: Narration[]
}
const defaults = {
  guideConfigurations: {} as Record<string, GuideConfiguration>,
  guideReleases: [] as GuideRelease[],
  withdrawnGuideReleases: [] as string[],
  identities: [
    {
      id: 'guide-default',
      avatar: defaultGuideAvatar,
      enabled: true,
      name: '小央',
      role: '陪伴小学生探索中华历史文化的博物馆讲解员',
      voice: '温暖自然',
      rate: 1,
      full: '',
      half: '',
      sprite: ''
    }
  ],
  scenes: [
    {
      id: 'home',
      name: '首页综合问答',
      description: '全站文物、已有内容与中华历史文化',
      form: 'full'
    },
    {
      id: 'museum',
      name: '小小博物馆',
      description: '围绕当前文物讲解，支持文化延伸问答',
      form: 'half'
    },
    {
      id: 'knowledge',
      name: '央博知识库',
      description: '围绕当前知识库主题讲解，支持综合问答',
      form: 'sprite'
    }
  ].map(
    (s) =>
      ({
        ...s,
        digitalIds: ['guide-default'],
        defaultDigitalId: 'guide-default',
        modelId: 1,
        knowledgeIds: [1, 2],
        promptId: s.id === 'home' ? 1 : 2,
        promptVersion: 1,
        templateId: s.id === 'knowledge' ? 'theme' : 'artifact',
        external: false,
        sourceIds: [] as string[],
        idleMinutes: 5,
        historyTurns: 6,
        resume: true,
        interrupt: true,
        image: true,
        video: true,
        scripts: {}
      }) as Scene
  ),
  templates: [
    {
      id: 'artifact',
      name: '文物讲解',
      content: '它是什么\n所属时代\n可观察的外形特征\n用途与工艺\n文化意义\n互动提问'
    },
    {
      id: 'theme',
      name: '文化主题讲解',
      content: '主题概览\n历史背景\n关键人物、事件与文物\n文化特点\n与今天的联系\n推荐探索'
    }
  ],
  sources: [] as { id: string; name: string; url: string; enabled: boolean }[],
  narrations: [] as Narration[],
  releases: [] as { version: number; at: string; note: string; snapshot: any }[],
  assignments: [] as { sceneId: string; version: number; at: string; status: string }[]
}
const key = 'museum-ai-scenes-v1'
let initial = clone(defaults)
try {
  const saved = localStorage.getItem(key)
  if (saved) initial = migrateSceneData(JSON.parse(saved))
} catch {
  /* Use defaults when storage is unavailable. */
}
export const sceneState = reactive(initial)
export function guideConfiguration(id: string): GuideConfiguration {
  if (!sceneState.guideConfigurations[id])
    sceneState.guideConfigurations[id] = clone({
      scenes: sceneState.scenes.map((s) => ({ ...s, digitalIds: [id], defaultDigitalId: id })),
      templates: sceneState.templates,
      sources: sceneState.sources,
      narrations: sceneState.narrations
    })
  return sceneState.guideConfigurations[id]
}
export function guideConfigurationIssues(id: string) {
  const config = guideConfiguration(id)
  return config.scenes.flatMap((s) =>
    sceneIssues(s, config, false).map((issue) => `${s.name}：${issue}`)
  )
}
referenceProviders.push((kind, id) =>
  Object.entries(sceneState.guideConfigurations).flatMap(([guideId, config]) => {
    const used = config.scenes.some((s) =>
      kind === 'model'
        ? s.modelId === id
        : kind === 'knowledge'
          ? s.knowledgeIds.includes(id)
          : kind === 'prompt'
            ? s.promptId === id
            : kind === 'script'
              ? Object.values(s.scripts).includes(id) ||
                scriptEvents.some(
                  (e) =>
                    !s.scripts[e.key] &&
                    aiState.script.some(
                      (r) => r.id === id && r.event === e.key && r.scope === 'global'
                    )
                )
              : false
    )
    return used
      ? ['数字人：' + (sceneState.identities.find((p) => p.id === guideId)?.name || guideId)]
      : []
  })
)
export function publishGuide(
  guideId: string,
  scope: GuideRelease['scope'],
  schools: GuideRelease['schools'],
  note: string
) {
  const guide = sceneState.identities.find((p) => p.id === guideId)
  if (!guide?.enabled || !guide.name.trim() || !guide.role.trim() || !guide.voice.trim())
    throw new Error('请完善并启用数字人草稿')
  if (scope === 'schools' && (!schools.length || schools.some((s) => !s.id || !s.name)))
    throw new Error('请选择发布学校')
  if (!note.trim()) throw new Error('请填写发布说明')
  const config = guideConfiguration(guideId)
  const issues = guideConfigurationIssues(guideId)
  if (issues.length) throw new Error(issues.join('；'))
  const version =
    Math.max(
      0,
      ...sceneState.guideReleases.filter((r) => r.guideId === guideId).map((r) => r.version)
    ) + 1
  const release: GuideRelease = {
    id: `${guideId}:v${version}`,
    guideId,
    version,
    at: new Date().toLocaleString(),
    note: note.trim(),
    scope,
    schools: scope === 'all' ? [] : clone(schools),
    snapshot: clone(guide),
    configuration: clone(config),
    dependencies: clone({
      models: aiState.models
        .filter((m) => config.scenes.some((s) => s.modelId === m.id))
        .map((m) => Object.fromEntries(Object.entries(m).filter(([key]) => key !== 'apiKey'))),
      prompts: config.scenes.map((s) => promptRelease(s.promptId, s.promptVersion)),
      rules: aiState.script.filter((r) =>
        config.scenes.some((s) =>
          scriptEvents.some((e) =>
            s.scripts[e.key] ? s.scripts[e.key] === r.id : r.scope === 'global' && r.event === e.key
          )
        )
      ),
      knowledge: aiState.knowledge.filter((k) =>
        config.scenes.some((s) => s.knowledgeIds.includes(k.id))
      )
    })
  }
  sceneState.guideReleases.unshift(release)
  return release
}
export function resolveGuideRelease(guideId: string, schoolId: string) {
  const records = sceneState.guideReleases
    .filter((r) => r.guideId === guideId)
    .sort((a, b) => b.version - a.version)
  // An explicit school assignment overrides the global assignment, including withdrawal.
  const release =
    records.find((r) => r.scope === 'schools' && r.schools.some((s) => s.id === schoolId)) ||
    records.find((r) => r.scope === 'all')
  return release && !sceneState.withdrawnGuideReleases.includes(release.id) ? release : undefined
}
// Migrate earlier single-guide drafts and snapshots without modifying their stored history.
export function migrateSceneData(saved: any) {
  const identities =
    saved.identities ||
    (saved.identity
      ? [{ ...saved.identity, id: 'guide-default', enabled: true }]
      : clone(defaults.identities))
  const scenes = (saved.scenes || defaults.scenes).map((s: Scene) => ({
    ...s,
    digitalIds: s.digitalIds || [identities[0].id],
    defaultDigitalId: s.defaultDigitalId || identities[0].id
  }))
  const result = {
    ...clone(defaults),
    ...saved,
    identities: identities.map((p: Record<string, unknown>) => ({
      ...p,
      avatar: p.avatar || defaultGuideAvatar
    })),
    scenes
  }
  delete result.identity
  return result
}
referenceProviders.push((kind, id) =>
  sceneState.scenes
    .filter((s) =>
      kind === 'model'
        ? s.modelId === id
        : kind === 'knowledge'
          ? s.knowledgeIds.includes(id)
          : kind === 'prompt'
            ? s.promptId === id
            : kind === 'script'
              ? Object.values(s.scripts).includes(id) ||
                scriptEvents.some(
                  (e) =>
                    !s.scripts[e.key] &&
                    aiState.script.some(
                      (r) => r.id === id && r.event === e.key && r.scope === 'global'
                    )
                )
              : false
    )
    .map((s) => '应用场景：' + s.name)
)
export const storageStatus = reactive({ failed: false })
watch(
  sceneState,
  () => {
    try {
      localStorage.setItem(key, JSON.stringify(sceneState))
      storageStatus.failed = false
    } catch {
      storageStatus.failed = true
    }
  },
  { deep: true }
)

export function sceneIssues(
  scene: Scene,
  config?: GuideConfiguration,
  requirePublished = true
): string[] {
  const context = config || sceneState
  const issues: string[] = []
  if (!scene.digitalIds.length) issues.push('请至少选择一个可选数字人')
  if (!scene.digitalIds.includes(scene.defaultDigitalId)) issues.push('默认数字人必须在可选范围内')
  for (const id of scene.digitalIds) {
    const person = sceneState.identities.find((p) => p.id === id)
    if (!person?.enabled) issues.push('可选数字人已停用或不存在')
    else if (!person.name.trim() || !person.role.trim() || !person.voice.trim())
      issues.push('请完善可选数字人的名称、角色和音色')
    if (
      requirePublished &&
      !sceneState.guideReleases.some(
        (r) => r.guideId === id && !sceneState.withdrawnGuideReleases.includes(r.id)
      )
    )
      issues.push('可选数字人尚未发布或已撤回')
  }
  if (scene.id === 'home' && scene.form !== 'full') issues.push('首页需要全身展示形态')
  if (scene.id !== 'home' && scene.form === 'full') issues.push('讲解场景请选择半身或精灵形态')
  if (
    !aiState.models.some(
      (m) => m.id === scene.modelId && m.status === 'enabled' && m.purpose !== 'embedding'
    )
  )
    issues.push('请选择可用的对话模型')
  if (
    !scene.knowledgeIds.length ||
    scene.knowledgeIds.some(
      (id) => !aiState.knowledge.some((k) => k.id === id && k.status === 'enabled')
    )
  )
    issues.push('请选择可用的知识库')
  if (
    !aiState.prompt.some((p) => p.id === scene.promptId && p.status === 'enabled') ||
    !promptRelease(scene.promptId, scene.promptVersion)
  )
    issues.push('请选择已发布的提示词版本')
  if (
    scene.external &&
    (!scene.sourceIds.length ||
      scene.sourceIds.some((id) => !context.sources.some((s) => s.id === id && s.enabled)))
  )
    issues.push('外部查询需要启用且已选中的可信来源')
  if (
    scene.external &&
    scene.sourceIds.some((id) => {
      const source = context.sources.find((s) => s.id === id)
      try {
        return !source?.name.trim() || new URL(source.url).protocol !== 'https:'
      } catch {
        return true
      }
    })
  )
    issues.push('授权来源名称或 HTTPS 地址无效')
  if (
    scene.id !== 'home' &&
    !context.templates.some((t) => t.id === scene.templateId && t.content.trim())
  )
    issues.push('讲解模板不能为空')
  for (const event of scriptEvents) {
    const id = scene.scripts[event.key]
    if (
      id
        ? !aiState.script.some(
            (s) => s.id === id && s.event === event.key && s.status === 'enabled'
          )
        : !aiState.script.some(
            (s) => s.event === event.key && s.scope === 'global' && s.status === 'enabled'
          )
    )
      issues.push(`${event.label}话术缺失或引用失效`)
  }
  return issues
}
export function releaseScenes(note: string) {
  const issues = sceneState.scenes.flatMap((s) => sceneIssues(s).map((i) => `${s.name}：${i}`))
  if (!note.trim()) issues.push('请填写发布说明')
  if (issues.length) throw new Error(issues.join('；'))
  const modelIds = sceneState.scenes.map((s) => s.modelId)
  const models = aiState.models
    .filter((m) => modelIds.includes(m.id))
    .map((m) => {
      return Object.fromEntries(Object.entries(m).filter(([key]) => key !== 'apiKey'))
    })
  const snapshot = clone({
    identities: sceneState.identities
      .filter((p) => sceneState.scenes.some((s) => s.digitalIds.includes(p.id)))
      .map(
        (p) =>
          sceneState.guideReleases.find(
            (r) => r.guideId === p.id && !sceneState.withdrawnGuideReleases.includes(r.id)
          )!.snapshot
      ),
    guideReleases: sceneState.guideReleases.filter((r) =>
      sceneState.scenes.some((s) => s.digitalIds.includes(r.guideId))
    ),
    withdrawnGuideReleases: sceneState.withdrawnGuideReleases,
    scenes: sceneState.scenes,
    templates: sceneState.templates,
    sources: sceneState.sources,
    narrations: sceneState.narrations.filter((n) => n.reviewed),
    models,
    prompts: sceneState.scenes.map((s) => promptRelease(s.promptId, s.promptVersion)),
    rules: aiState.script.filter((s) => s.status === 'enabled'),
    knowledge: aiState.knowledge.filter((k) =>
      sceneState.scenes.some((s) => s.knowledgeIds.includes(k.id))
    ),
    resources: Object.fromEntries(
      Object.entries(aiState.resourcesByBase)
        .filter(([id]) => sceneState.scenes.some((s) => s.knowledgeIds.includes(Number(id))))
        .map(([id, resources]) => [
          id,
          resources
            .filter((r) => r.status !== 'disabled' && r.parseStatus === '已完成')
            .map((r) => ({ ...r, preview: r.preview?.startsWith('blob:') ? '' : r.preview }))
        ])
    ),
    policy:
      '当前对象优先；资料不足时查询授权来源；区分通用背景与对象事实；证据不足兜底；输入/检索/输出/播报适龄检查；按访客和对象隔离会话'
  })
  const release = {
    version: Math.max(0, ...sceneState.releases.map((r) => r.version)) + 1,
    at: new Date().toLocaleString(),
    note: note.trim(),
    snapshot
  }
  sceneState.releases.unshift(release)
  return release
}
