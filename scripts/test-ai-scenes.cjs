const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const values = new Map()
const localStorage = { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, v) }
const cache = {}
function load(name) {
  if (cache[name]) return cache[name]
  const source = fs.readFileSync(
    path.join(__dirname, '../src/views/ai/shared', name + '.ts'),
    'utf8'
  )
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const mod = { exports: {} }
  cache[name] = mod.exports
  new Function('require', 'module', 'exports', 'localStorage', code)(
    (id) =>
      id === './ai-store'
        ? load('ai-store')
        : id.startsWith('@/assets/')
          ? { default: id }
          : require(id),
    mod,
    mod.exports,
    localStorage
  )
  return mod.exports
}
const { aiState, references } = load('ai-store')
const {
  sceneState,
  sceneIssues,
  releaseScenes,
  migrateSceneData,
  publishGuide,
  guideConfiguration,
  guideConfigurationIssues,
  resolveGuideRelease
} = load('scene-store')
assert.equal(sceneState.scenes.length, 3)
assert.equal(resolveGuideRelease('guide-default', 'school-a'), undefined)
assert.ok(sceneIssues(sceneState.scenes[0]).some((x) => x.includes('尚未发布')))
publishGuide('guide-default', 'all', [], '首个数字人版本')
assert.deepEqual(
  sceneState.scenes.flatMap((s) => sceneIssues(s)),
  []
)
assert.throws(() => releaseScenes(''), /发布说明/)
aiState.models[0].apiKey = 'test-secret-do-not-persist'
const first = releaseScenes('初始场景')
assert.equal(first.version, 1)
assert.ok(!JSON.stringify(first).includes('test-secret-do-not-persist'))
const frozen = JSON.stringify(first)
sceneState.identities[0].name = '草稿变更'
aiState.models[0].name = '模型草稿变更'
sceneState.templates[0].content = '新模板'
assert.equal(JSON.stringify(first), frozen)
assert.ok(references('model', 1).some((x) => x.includes('应用场景')))
const scene = sceneState.scenes[0]
scene.external = true
assert.ok(sceneIssues(scene).some((x) => x.includes('可信来源')))
sceneState.sources.push({ id: 'a', name: '资料站', url: 'https://example.org', enabled: true })
scene.sourceIds = ['a']
assert.deepEqual(sceneIssues(scene), [])
sceneState.sources[0].url = 'javascript:alert(1)'
assert.throws(() => releaseScenes('无效来源'), /HTTPS/)
sceneState.sources[0].url = 'https://example.org'
scene.scripts.timeout = 9999
assert.ok(sceneIssues(scene).some((x) => x.includes('话术')))
delete scene.scripts.timeout
sceneState.narrations.push({ id: 'draft', reviewed: false })
const second = releaseScenes('二次发布')
assert.equal(second.version, 2)
assert.equal(second.snapshot.narrations.length, 0)
assert.equal(JSON.stringify(first), frozen)
console.log('AI scene validation, references, immutable releases and secret exclusion passed')
const migrated = migrateSceneData({
  identity: { name: '旧角色', role: '讲解员', voice: '原音色' },
  scenes: [{ id: 'home' }]
})
assert.equal(migrated.identities[0].name, '旧角色')
assert.deepEqual(migrated.scenes[0].digitalIds, ['guide-default'])
assert.equal(migrated.scenes[0].defaultDigitalId, 'guide-default')
sceneState.identities.push({ ...sceneState.identities[0], id: 'second', name: '第二位讲解员' })
scene.digitalIds.push('second')
scene.defaultDigitalId = 'second'
publishGuide('second', 'all', [], '第二位数字人')
assert.deepEqual(sceneIssues(scene), [])
const multi = releaseScenes('多数字人发布')
assert.equal(multi.snapshot.identities.length, 2)
sceneState.identities[1].voice = '新音色'
assert.notEqual(multi.snapshot.identities[1].voice, sceneState.identities[1].voice)
sceneState.identities[1].enabled = false
assert.ok(sceneIssues(scene).some((x) => x.includes('停用')))
sceneState.identities[1].enabled = true
scene.digitalIds = ['guide-default']
assert.ok(sceneIssues(scene).some((x) => x.includes('默认数字人')))
scene.digitalIds = []
assert.ok(sceneIssues(scene).some((x) => x.includes('至少选择')))
console.log('Multi-guide selection, default validation, migration and snapshots passed')
const publicVersion = resolveGuideRelease('guide-default', 'school-b')
sceneState.identities[0].name = '学校 A 定制'
assert.notEqual(resolveGuideRelease('guide-default', 'school-b').snapshot.name, '学校 A 定制')
assert.throws(() => publishGuide('guide-default', 'schools', [], '缺少范围'), /学校/)
const schoolVersion = publishGuide(
  'guide-default',
  'schools',
  [{ id: 'school-a', name: 'A 学校' }],
  '学校定制'
)
assert.equal(resolveGuideRelease('guide-default', 'school-a').version, schoolVersion.version)
assert.equal(resolveGuideRelease('guide-default', 'school-b').version, publicVersion.version)
publishGuide('guide-default', 'all', [], '更新通用版本')
assert.equal(resolveGuideRelease('guide-default', 'school-a').version, schoolVersion.version)
sceneState.withdrawnGuideReleases.push(schoolVersion.id)
assert.equal(resolveGuideRelease('guide-default', 'school-a'), undefined)
assert.ok(resolveGuideRelease('guide-default', 'school-b'))
const savedDraft = migrateSceneData({
  identities: sceneState.identities,
  scenes: sceneState.scenes
})
assert.equal(savedDraft.guideReleases.length, 0, 'old drafts must not be auto-published')
console.log(
  'School publication: draft isolation, school precedence, withdrawal and migration passed'
)
const configA = guideConfiguration('guide-default')
const configB = guideConfiguration('second')
const originalB = JSON.stringify(configB)
configA.scenes[0].historyTurns = 12
configA.templates[0].content = 'A 的独立模板'
assert.equal(JSON.stringify(configB), originalB, 'guide configs cannot share mutable objects')
const isolated = publishGuide('guide-default', 'all', [], '独立配置')
const immutable = JSON.stringify(isolated)
configA.scenes[0].historyTurns = 15
configA.templates[0].content = '未发布修改'
assert.equal(JSON.stringify(isolated), immutable)
configA.scenes[0].modelId = 999999
assert.ok(guideConfigurationIssues('guide-default').length)
assert.throws(() => publishGuide('guide-default', 'all', [], '错误模型'), /模型/)
assert.equal(JSON.stringify(configB), originalB)
assert.ok(references('model', configB.scenes[0].modelId).some((x) => x.startsWith('数字人：')))
console.log(
  'Independent guide configuration, publication snapshots and reference validation passed'
)
const publishedAvatar = isolated.snapshot.avatar
sceneState.identities[0].avatar = 'data:image/png;base64,draft-avatar'
assert.equal(
  isolated.snapshot.avatar,
  publishedAvatar,
  'editing avatar cannot change a published version'
)
assert.ok(
  migrateSceneData({ identity: { name: '旧数字人' }, scenes: [] }).identities[0].avatar,
  'old guides receive a fallback avatar'
)
console.log('Guide avatar migration and publication isolation passed')
