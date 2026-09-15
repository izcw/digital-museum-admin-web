const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { nextTick } = require('vue')
const root = path.resolve(__dirname, '..')
function loadStore() {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
  const source = fs.readFileSync(path.join(root, 'src/views/ai/shared/ai-store.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', 'localStorage', code)(
    (id) => (id.startsWith('@/assets/') ? { default: id } : require(id)),
    mod,
    mod.exports,
    storage
  )
  return { ...mod.exports, values }
}
async function main() {
  const {
    aiState,
    clone,
    digitalConfig,
    digitalIssues,
    publishDigital,
    promptRelease,
    resolveScript,
    references,
    values
  } = loadStore()
  const row = aiState.digital[0]
  assert.deepEqual(digitalIssues(row), [], 'seed digital should be publishable')
  const first = publishDigital(row, '首次发布')
  assert.equal(first.version, 1)
  assert.equal(row.publishedVersion, 1)
  const frozen = JSON.stringify(first)
  const prompt = aiState.prompt.find((p) => p.id === row.promptId)
  prompt.content = '新草稿内容'
  aiState.models[0].name = '更新模型名称'
  aiState.script.find((s) => s.event === 'timeout').content = '更新超时话术'
  row.name = '数字人新草稿'
  assert.equal(JSON.stringify(first), frozen, 'draft/dependency updates cannot mutate a release')
  assert.notEqual(JSON.stringify(digitalConfig(row)), JSON.stringify(first.config))
  assert.notEqual(
    promptRelease(row.promptId, 1).config.content,
    prompt.content,
    'pin published prompt version'
  )
  const second = publishDigital(row, '第二次发布')
  assert.equal(second.version, 2)
  assert.equal(first.config.name, '央央')
  Object.assign(row, clone(first.config))
  assert.equal(row.publishedVersion, 2, 'restore config does not publish')
  assert.equal(publishDigital(row, '恢复后发布').version, 3, 'versions monotonically increase')
  const global = resolveScript(row, 'timeout')
  const specific = {
    ...clone(global),
    id: 100,
    scope: 'digital',
    digitalId: row.id,
    content: '专属超时'
  }
  aiState.script.push(specific)
  assert.equal(resolveScript(row, 'timeout').id, 100, 'digital scope precedes global')
  row.scripts.timeout = global.id
  assert.equal(resolveScript(row, 'timeout').id, global.id, 'explicit choice precedes automatic')
  global.status = 'disabled'
  assert.ok(
    digitalIssues(row).some((v) => v.includes('请求超时')),
    'invalid explicit reference blocks publish'
  )
  delete row.scripts.timeout
  assert.equal(resolveScript(row, 'timeout').id, 100)
  row.modelId = 4
  assert.ok(
    digitalIssues(row).some((v) => v.includes('对话模型')),
    'embedding model cannot be used for conversation'
  )
  row.modelId = 1
  const originalStatus = aiState.models[0].status
  aiState.models[0].status = 'disabled'
  assert.throws(() => publishDigital(row, '失败'), /对话模型/)
  aiState.models[0].status = originalStatus
  assert.ok(references('knowledge', 1).length)
  assert.ok(references('model', 1).length)
  assert.ok(references('prompt', 1).length)
  assert.ok(references('script', global.id).length, 'active release protects inherited scripts')
  const original = aiState.resourcesByBase['1'].find((r) => r.directory === 'bronze')
  const isolated = aiState.resourcesByBase['2'].find((r) => r.id === original.id)
  const originalName = original.name
  isolated.name = '其他库单独修改'
  assert.equal(original.name, originalName)
  aiState.models[0].apiKey = 'sensitive-test-value'
  await nextTick()
  const stored = [...values.values()].at(-1)
  assert.ok(stored)
  assert.ok(
    !stored.includes('sensitive-test-value'),
    'credentials omitted from persisted preview state'
  )
  assert.equal(JSON.parse(stored).digital[0].releases[0].version, 3)
  console.log(
    'PASS: publication validation, immutable snapshots, fixed prompt versions, restore-as-draft, fallback precedence, reference protection, knowledge isolation, persistence without credentials'
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
