<template>
  <main class="workbench art-full-height">
    <GuideTable
      :rows="guideRows"
      @add="addGuide"
      @edit="editGuideById"
      @configure="openGuideConfiguration"
      @publish="openGuidePublication"
      @remove="deleteGuideRow"
    />
    <ElDialog
      v-model="guideEditorOpen"
      :title="
        sceneState.identities.some((p) => p.id === guideDraft.id) ? '编辑数字人' : '新增数字人'
      "
      width="min(1000px, 94vw)"
      :close-on-click-modal="false"
      :before-close="closeGuideEditor"
    >
      <ElAlert title="保存仅修改草稿。发布后，学校客户端才能使用新版本。" :closable="false" />
      <ElForm ref="guideFormRef" :model="guideDraft" :rules="guideFormRules" label-width="100px"
        ><ElFormItem label="头像"
          ><GuideAvatarField v-if="guideEditorOpen" v-model="guideDraft.avatar" /></ElFormItem
        ><ElFormItem label="名称" prop="name"
          ><ElInput v-model="guideDraft.name" maxlength="40" /></ElFormItem
        ><ElFormItem label="角色设定" prop="role"
          ><ElInput v-model="guideDraft.role" type="textarea" :rows="3" /></ElFormItem
        ><ElFormItem label="音色" prop="voice"><ElInput v-model="guideDraft.voice" /></ElFormItem
        ><ElFormItem label="语速"
          ><ElInputNumber v-model="guideDraft.rate" :min="0.5" :max="1.5" :step="0.1" /></ElFormItem
        ><ElFormItem label="全身资源"
          ><ElInput v-model="guideDraft.full" placeholder="资源路径" /></ElFormItem
        ><ElFormItem label="半身资源"
          ><ElInput v-model="guideDraft.half" placeholder="同一数字人的半身素材" /></ElFormItem
        ><ElFormItem label="精灵资源"
          ><ElInput v-model="guideDraft.sprite" placeholder="同一数字人的精灵素材" /></ElFormItem
      ></ElForm>
      <template #footer
        ><ElButton @click="closeGuideEditor()">取消</ElButton
        ><ElButton type="primary" @click="saveGuideDraft">保存草稿</ElButton></template
      >
    </ElDialog>
    <ElDialog
      v-model="guidePublishOpen"
      :title="(editingGuide?.name || '数字人') + ' · 发布与版本'"
      width="min(1100px, 94vw)"
      :close-on-click-modal="false"
      ><GuidePublishing v-if="guidePublishOpen && editingGuide" :guide-id="editingGuideId"
    /></ElDialog>
    <ElDialog
      v-model="settingsOpen"
      :title="configurationName + ' · 配置'"
      width="min(1200px, 96vw)"
      class="management-dialog"
      align-center
      :close-on-click-modal="false"
      ><ElTabs v-model="tab">
        <ElTabPane label="回答设置" name="scenes">
          <ElAlert
            title="先选择使用位置，再选择回答用的知识库。这里的修改自动保存为当前数字人的草稿，发布后才生效。"
            :closable="false"
          />
          <ElForm label-width="130px" class="simple-settings">
            <ElFormItem label="在哪里使用"
              ><ElRadioGroup v-model="selected"
                ><ElRadioButton
                  v-for="scene in activeConfig.scenes"
                  :key="scene.id"
                  :value="scene.id"
                  >{{ scene.name }}</ElRadioButton
                ></ElRadioGroup
              ></ElFormItem
            >
            <ElFormItem label="使用哪些知识"
              ><div class="setting-field"
                ><ElSelect v-model="current.knowledgeIds" multiple placeholder="选择知识库"
                  ><ElOption
                    v-for="base in aiState.knowledge.filter((k) => k.status === 'enabled')"
                    :key="base.id"
                    :value="base.id"
                    :label="base.name" /></ElSelect
                ><small>数字人优先根据这些知识库回答问题。</small></div
              ></ElFormItem
            >
            <ElFormItem label="使用哪个模型"
              ><ElSelect v-model="current.modelId"
                ><ElOption
                  v-for="model in aiState.models.filter(
                    (m) => m.status === 'enabled' && m.purpose !== 'embedding'
                  )"
                  :key="model.id"
                  :value="model.id"
                  :label="model.name" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="数字人展示方式"
              ><ElSelect v-model="current.form" :disabled="current.id === 'home'"
                ><ElOption
                  v-for="(name, id) in forms"
                  :key="id"
                  :label="name"
                  :value="id"
                  :disabled="current.id !== 'home' && id === 'full'" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="可以打断讲解"
              ><ElSwitch v-model="current.interrupt" /><span class="field-hint"
                >孩子提问后，可继续原来的讲解。</span
              ></ElFormItem
            >
          </ElForm>
          <ElCollapse
            ><ElCollapseItem title="更多设置（通常保留默认即可）" name="advanced"
              ><p>需要调整回答风格、资料不足时的话术、图片视频或对话记忆时，再修改以下内容。</p
              ><ElButton @click="editScene">调整回答规则和对话设置</ElButton><ElDivider />
              <header
                ><b>允许查询的外部资料来源</b
                ><ElButton @click="addSource">添加来源</ElButton></header
              >
              <p>默认只使用站内知识。需要联网补充时，先配置来源，再在回答规则中启用。</p>
              <ElTable :data="activeConfig.sources" empty-text="尚未添加外部来源"
                ><ElTableColumn label="来源名称"
                  ><template #default="{ row }"
                    ><ElInput v-model="row.name" /></template></ElTableColumn
                ><ElTableColumn label="网址"
                  ><template #default="{ row }"
                    ><ElInput v-model="row.url" placeholder="https://…" /></template></ElTableColumn
                ><ElTableColumn label="启用" width="90"
                  ><template #default="{ row }"
                    ><ElSwitch
                      v-model="row.enabled"
                      :before-change="() => validateSource(row)" /></template></ElTableColumn
                ><ElTableColumn width="90"
                  ><template #default="{ row }"
                    ><ElButton link type="danger" @click="removeSource(row.id)"
                      >删除</ElButton
                    ></template
                  ></ElTableColumn
                ></ElTable
              >
            </ElCollapseItem></ElCollapse
          >
        </ElTabPane>
        <ElTabPane label="讲解内容" name="content"
          ><header
            ><p>添加要讲解的文物或主题，填写资料和讲解稿。</p
            ><ElButton type="primary" @click="editContent()">新增讲解</ElButton></header
          ><ElTable :data="activeConfig.narrations" empty-text="新增文物或文化主题，关联知识库"
            ><ElTableColumn prop="name" label="文物 / 主题" /><ElTableColumn
              prop="kind"
              label="类型"
            /><ElTableColumn label="状态"
              ><template #default="{ row }">{{
                row.reviewed ? '资料已确认' : '草稿'
              }}</template></ElTableColumn
            ><ElTableColumn label="操作"
              ><template #default="{ row }"
                ><ElButton link type="primary" @click="editContent(row)">编辑</ElButton
                ><ElButton link @click="previewContent(row)">预览</ElButton
                ><ElButton link type="danger" @click="removeContent(row.id)"
                  >删除</ElButton
                ></template
              ></ElTableColumn
            ></ElTable
          ><ElCollapse
            ><ElCollapseItem title="讲解顺序模板（可选）" name="templates"
              ><div class="cards"
                ><ElCard v-for="t in activeConfig.templates" :key="t.id" shadow="never"
                  ><template #header>{{ t.name }}模板</template
                  ><ElInput v-model="t.content" type="textarea" :rows="8" /><p
                    >每行一个段落，生成时仅使用已确认事实。</p
                  ></ElCard
                ></div
              ></ElCollapseItem
            ></ElCollapse
          ></ElTabPane
        >
      </ElTabs></ElDialog
    >
    <ElDialog
      v-model="editing"
      :title="draft.name + ' · 更多设置'"
      width="min(1100px, 94vw)"
      :close-on-click-modal="false"
      :before-close="closeEditor"
      align-center
      ><ElTabs
        ><ElTabPane label="模型与知识"
          ><ElForm label-width="150px"
            ><ElFormItem label="展示形态"
              ><ElSelect v-model="draft.form" :disabled="draft.id === 'home'"
                ><ElOption
                  v-for="(name, id) in forms"
                  :key="id"
                  :value="id"
                  :label="name" /></ElSelect></ElFormItem
            ><ElFormItem label="对话模型"
              ><ElSelect v-model="draft.modelId"
                ><ElOption
                  v-for="m in aiState.models.filter(
                    (m) => m.status === 'enabled' && m.purpose !== 'embedding'
                  )"
                  :key="m.id"
                  :value="m.id"
                  :label="m.name" /></ElSelect></ElFormItem
            ><ElFormItem label="知识库"
              ><ElSelect v-model="draft.knowledgeIds" multiple
                ><ElOption
                  v-for="k in aiState.knowledge.filter((k) => k.status === 'enabled')"
                  :key="k.id"
                  :value="k.id"
                  :label="k.name" /></ElSelect></ElFormItem
            ><ElFormItem label="提示词"
              ><ElSelect v-model="draft.promptId" @change="changePrompt"
                ><ElOption
                  v-for="p in aiState.prompt.filter((p) => p.status === 'enabled')"
                  :key="p.id"
                  :value="p.id"
                  :label="p.name" /></ElSelect></ElFormItem
            ><ElFormItem label="固定提示词版本"
              ><ElSelect v-model="draft.promptVersion"
                ><ElOption
                  v-for="r in promptVersions"
                  :key="r.version"
                  :value="r.version"
                  :label="'V' + r.version" /></ElSelect></ElFormItem
            ><ElFormItem v-if="draft.id !== 'home'" label="讲解模板"
              ><ElSelect v-model="draft.templateId"
                ><ElOption
                  v-for="t in activeConfig.templates"
                  :key="t.id"
                  :value="t.id"
                  :label="t.name" /></ElSelect></ElFormItem
            ><ElFormItem label="允许外部补充查询"><ElSwitch v-model="draft.external" /></ElFormItem
            ><ElFormItem v-if="draft.external" label="授权来源"
              ><ElSelect v-model="draft.sourceIds" multiple
                ><ElOption
                  v-for="s in activeConfig.sources.filter((s) => s.enabled)"
                  :key="s.id"
                  :value="s.id"
                  :label="s.name" /></ElSelect></ElFormItem></ElForm></ElTabPane
        ><ElTabPane label="上下文与媒体"
          ><ElForm label-width="180px"
            ><ElFormItem label="闲置清理（分钟）"
              ><ElInputNumber v-model="draft.idleMinutes" :min="1" :max="60" /></ElFormItem
            ><ElFormItem label="近期对话轮数"
              ><ElInputNumber v-model="draft.historyTurns" :min="1" :max="20" /></ElFormItem
            ><ElFormItem label="允许打断讲解"><ElSwitch v-model="draft.interrupt" /></ElFormItem
            ><ElFormItem label="同次访问恢复进度"><ElSwitch v-model="draft.resume" /></ElFormItem
            ><ElFormItem label="允许图片"><ElSwitch v-model="draft.image" /></ElFormItem
            ><ElFormItem label="允许视频"><ElSwitch v-model="draft.video" /></ElFormItem></ElForm
          ><ElAlert
            title="新对象创建独立会话；只有用户主动选择继续时传递问题和摘要。新访客清空历史。"
            :closable="false" /></ElTabPane
        ><ElTabPane label="欢迎与异常"
          ><ElForm label-width="150px"
            ><ElFormItem v-for="event in scriptEvents" :key="event.key" :label="event.label"
              ><ElSelect v-model="draft.scripts[event.key]" clearable placeholder="继承全局规则"
                ><ElOption
                  v-for="r in aiState.script.filter(
                    (r) => r.status === 'enabled' && r.event === event.key
                  )"
                  :key="r.id"
                  :value="r.id"
                  :label="r.name" /></ElSelect></ElFormItem></ElForm
          ><p>场景显式配置 → 全局规则 → 客户端本地安全兜底。</p></ElTabPane
        ></ElTabs
      ><template #footer
        ><ElButton @click="closeEditor()">取消</ElButton
        ><ElButton type="primary" @click="saveScene">保存草稿</ElButton></template
      ></ElDialog
    >
    <ElDialog
      v-model="contentOpen"
      title="编辑讲解内容"
      class="narration-dialog"
      width="min(1100px, 94vw)"
      :close-on-click-modal="false"
      :before-close="closeContent"
      ><ElForm label-width="110px"
        ><ElFormItem label="类型"
          ><ElRadioGroup v-model="content.kind"
            ><ElRadioButton value="文物">文物</ElRadioButton
            ><ElRadioButton value="文化主题">文化主题</ElRadioButton></ElRadioGroup
          ></ElFormItem
        ><ElFormItem label="名称"><ElInput v-model="content.name" /></ElFormItem
        ><ElFormItem label="知识库"
          ><ElSelect v-model="content.knowledgeId"
            ><ElOption
              v-for="k in aiState.knowledge"
              :key="k.id"
              :value="k.id"
              :label="k.name" /></ElSelect></ElFormItem
        ><ElFormItem label="已知事实"
          ><ElInput v-model="content.facts" type="textarea" :rows="3" /></ElFormItem
        ><ElFormItem label="资料出处"><ElInput v-model="content.source" /></ElFormItem
        ><ElFormItem label="推荐问题"
          ><ElInput
            v-model="content.questions"
            type="textarea"
            placeholder="每行一个问题" /></ElFormItem
        ><ElFormItem label="固定讲解稿"
          ><MarkdownEditor
            v-if="contentOpen"
            :key="content.id"
            v-model="content.text" /></ElFormItem
        ><ElFormItem label="资料已确认"
          ><ElSwitch v-model="content.reviewed" /><small>确认后才进入发布快照</small></ElFormItem
        ></ElForm
      ><template #footer
        ><ElButton @click="closeContent()">取消</ElButton
        ><ElButton type="primary" @click="saveContent">保存</ElButton></template
      ></ElDialog
    >
    <ElDialog
      v-model="contentPreviewOpen"
      class="narration-dialog"
      title="预览讲解内容"
      width="min(1100px, 94vw)"
    >
      <h3>{{ content.name }}</h3
      ><p>{{ content.facts }}</p
      ><p>资料出处：{{ content.source || '尚未填写' }}</p>
      <MarkdownEditor
        v-if="contentPreviewOpen"
        :key="content.id"
        :model-value="content.text"
        readonly
      />
      <h4>推荐问题</h4><p style="white-space: pre-line">{{ content.questions || '尚未填写' }}</p>
    </ElDialog>
  </main>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { aiState, clone, scriptEvents } from '../../shared/ai-store'
  import { sceneState, guideConfiguration, type Narration } from '../../shared/scene-store'

  import GuidePublishing from '../../shared/GuidePublishing.vue'
  import { resolveGuideRelease } from '../../shared/scene-store'

  import GuideTable from './components/GuideTable.vue'
  import GuideAvatarField from './components/GuideAvatarField.vue'
  import defaultGuideAvatar from '@/assets/images/avatar/avatar1.webp'
  import type { FormInstance, FormRules } from 'element-plus'
  import MarkdownEditor from '../../knowledge/components/MarkdownEditor.vue'
  const tab = ref('scenes'),
    selected = ref('home')
  const forms: Record<string, string> = {
    full: '全身数字人',
    half: '半身数字人',
    sprite: '精灵形态'
  }
  const configurationOwner = ref(sceneState.identities[0]?.id || '')
  const activeConfig = computed(() => guideConfiguration(configurationOwner.value))
  const configurationName = computed(
    () => sceneState.identities.find((p) => p.id === configurationOwner.value)?.name || '数字人'
  )
  const settingsAdvanced = ref<string[]>([])
  function openGuideConfiguration(id: string) {
    tab.value = 'scenes'
    settingsAdvanced.value = []
    configurationOwner.value = id
    settingsOpen.value = true
  }
  const current = computed(() => activeConfig.value.scenes.find((s) => s.id === selected.value)!)
  const editingGuideId = ref(sceneState.identities[0]?.id || '')
  const editingGuide = computed(
    () => sceneState.identities.find((p) => p.id === editingGuideId.value)!
  )
  const settingsOpen = ref(false),
    guideEditorOpen = ref(false),
    guidePublishOpen = ref(false)
  type Guide = (typeof sceneState.identities)[number]
  const guideDraft = ref<Guide>({
    id: '',
    avatar: defaultGuideAvatar,
    enabled: true,
    name: '',
    role: '',
    voice: '',
    rate: 1,
    full: '',
    half: '',
    sprite: ''
  })
  let guideOriginal = ''
  function latestGuideRelease(id: string) {
    return sceneState.guideReleases.find((r) => r.guideId === id)
  }
  function guideStatus(id: string) {
    if (!latestGuideRelease(id)) return 'draft'
    const targets = sceneState.guideReleases
      .filter((r) => r.guideId === id)
      .flatMap((r) => r.schools.map((s) => s.id))
    return ['', ...targets].some((school) => resolveGuideRelease(id, school))
      ? 'published'
      : 'withdrawn'
  }
  function guideScope(id: string) {
    if (guideStatus(id) !== 'published') return '未开放'
    const targeted = new Map(
      sceneState.guideReleases
        .filter((r) => r.guideId === id)
        .flatMap((r) => r.schools.map((s) => [s.id, s.name] as const))
    )
    const global = resolveGuideRelease(id, '')
    const available = [...targeted].filter(([school]) => resolveGuideRelease(id, school))
    const blocked = [...targeted].filter(([school]) => !resolveGuideRelease(id, school))
    return global
      ? `全部学校${targeted.size ? '（含学校专属配置）' : ''}${blocked.length ? `；${blocked.length} 所学校已撤回` : ''}`
      : available.map(([, name]) => name).join('、')
  }
  function hasDraftChanges(row: Guide) {
    const last = latestGuideRelease(row.id)
    return (
      !!last &&
      (JSON.stringify(row) !== JSON.stringify(last.snapshot) ||
        JSON.stringify(guideConfiguration(row.id)) !== JSON.stringify(last.configuration))
    )
  }
  const guideRows = computed(() =>
    sceneState.identities.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      avatar: p.avatar || defaultGuideAvatar,
      voice: p.voice,
      scenes: guideConfiguration(p.id)
        .scenes.map((s) => s.name)
        .join('、'),
      status: guideStatus(p.id),
      scope: guideScope(p.id),
      version: latestGuideRelease(p.id) ? 'V' + latestGuideRelease(p.id)!.version : '',
      publishedAt: latestGuideRelease(p.id)?.at || '',
      dirty: hasDraftChanges(p)
    }))
  )
  function editGuideById(id: string) {
    const row = sceneState.identities.find((p) => p.id === id)
    if (row) editGuideRow(row)
  }
  const guideFormRef = ref<FormInstance>()
  const guideFormRules: FormRules = {
    name: [{ required: true, whitespace: true, message: '请输入数字人名称', trigger: 'blur' }],
    role: [{ required: true, whitespace: true, message: '请输入角色设定', trigger: 'blur' }],
    voice: [{ required: true, whitespace: true, message: '请输入音色', trigger: 'blur' }]
  }
  function editGuideRow(row: Guide) {
    guideDraft.value = clone(row)
    guideOriginal = JSON.stringify(guideDraft.value)
    guideFormRef.value?.clearValidate()
    guideEditorOpen.value = true
  }
  async function closeGuideEditor(done?: () => void) {
    if (JSON.stringify(guideDraft.value) !== guideOriginal) {
      try {
        await ElMessageBox.confirm('放弃未保存的数字人修改？', '未保存修改')
      } catch {
        return
      }
    }
    guideEditorOpen.value = false
    if (typeof done === 'function') done()
  }
  async function saveGuideDraft() {
    if (!(await guideFormRef.value?.validate().catch(() => false))) return
    const row = guideDraft.value
    if (!row.name.trim() || !row.role.trim() || !row.voice.trim()) {
      ElMessage.warning('请填写名称、角色设定和音色')
      return
    }
    if (sceneState.identities.some((p) => p.id !== row.id && p.name.trim() === row.name.trim())) {
      ElMessage.warning('数字人名称已存在')
      return
    }
    row.name = row.name.trim()
    const index = sceneState.identities.findIndex((p) => p.id === row.id)
    if (index < 0) sceneState.identities.push(clone(row))
    else sceneState.identities[index] = clone(row)
    guideEditorOpen.value = false
    ElMessage.success('草稿已保存，请通过“发布 / 版本”开放给学校')
  }
  function openGuidePublication(id: string) {
    editingGuideId.value = id
    guidePublishOpen.value = true
  }
  function deleteGuideRow(id: string) {
    editingGuideId.value = id
    return removeGuide()
  }
  function addGuide() {
    const guide = {
      id: crypto.randomUUID(),
      avatar: defaultGuideAvatar,
      enabled: true,
      name: '新数字人',
      role: '面向小学生的文化讲解员',
      voice: '温暖自然',
      rate: 1,
      full: '',
      half: '',
      sprite: ''
    }
    guideDraft.value = guide
    guideOriginal = JSON.stringify(guide)
    guideFormRef.value?.clearValidate()
    guideEditorOpen.value = true
  }
  async function removeGuide() {
    if (
      sceneState.guideReleases.some(
        (r) =>
          r.guideId === editingGuideId.value && !sceneState.withdrawnGuideReleases.includes(r.id)
      )
    ) {
      ElMessage.warning('此数字人有已发布版本，请先撤回发布')
      return
    }

    try {
      await ElMessageBox.confirm('删除此数字人草稿？已发布快照仍保留。', '删除数字人')
      delete sceneState.guideConfigurations[editingGuideId.value]
      sceneState.identities = sceneState.identities.filter((p) => p.id !== editingGuideId.value)
      editingGuideId.value = sceneState.identities[0]?.id || ''
    } catch {
      /* cancelled */
    }
  }
  const editing = ref(false),
    draft = ref(clone(current.value))
  let original = ''
  const promptVersions = computed(
    () => aiState.prompt.find((p) => p.id === draft.value.promptId)?.releases || []
  )
  function editScene() {
    draft.value = clone(current.value)
    original = JSON.stringify(draft.value)
    editing.value = true
  }
  async function closeEditor(done?: () => void) {
    if (JSON.stringify(draft.value) !== original) {
      try {
        await ElMessageBox.confirm('放弃尚未保存的修改？', '未保存修改')
      } catch {
        return
      }
    }
    editing.value = false
    if (typeof done === 'function') done()
  }
  function changePrompt() {
    draft.value.promptVersion =
      aiState.prompt.find((p) => p.id === draft.value.promptId)?.publishedVersion || 0
  }
  function saveScene() {
    Object.assign(current.value, clone(draft.value))
    editing.value = false
    ElMessage.success('场景草稿已保存')
  }
  const blank = (): Narration => ({
    id: crypto.randomUUID(),
    kind: '文物',
    name: '',
    knowledgeId: 1,
    facts: '',
    source: '',
    templateId: 'artifact',
    text: '',
    questions: '',
    reviewed: false
  })
  const contentOpen = ref(false),
    content = ref(blank())
  const contentPreviewOpen = ref(false)
  let contentOriginal = ''
  function previewContent(row: Narration) {
    content.value = clone(row)
    contentPreviewOpen.value = true
  }
  async function closeContent(done?: () => void) {
    if (JSON.stringify(content.value) !== contentOriginal) {
      try {
        await ElMessageBox.confirm('放弃尚未保存的讲解修改？', '未保存修改')
      } catch {
        return
      }
    }
    contentOpen.value = false
    if (typeof done === 'function') done()
  }
  function editContent(row?: Narration) {
    content.value = row ? clone(row) : blank()
    contentOriginal = JSON.stringify(content.value)
    contentOpen.value = true
  }
  function saveContent() {
    const n = content.value
    if (!n.name.trim() || (n.reviewed && (!n.facts.trim() || !n.source.trim() || !n.text.trim()))) {
      ElMessage.warning('请填写名称；确认资料需要事实、出处和讲解稿')
      return
    }
    n.templateId = n.kind === '文物' ? 'artifact' : 'theme'
    const i = activeConfig.value.narrations.findIndex((r) => r.id === n.id)
    if (i < 0) activeConfig.value.narrations.push(clone(n))
    else activeConfig.value.narrations[i] = clone(n)
    contentOpen.value = false
  }
  async function removeContent(id: string) {
    try {
      await ElMessageBox.confirm('删除讲解草稿？已发布快照保留。', '删除讲解')
      activeConfig.value.narrations = activeConfig.value.narrations.filter((n) => n.id !== id)
    } catch {
      /* cancelled */
    }
  }
  function addSource() {
    activeConfig.value.sources.push({ id: crypto.randomUUID(), name: '', url: '', enabled: false })
  }
  function validateSource(s: { enabled: boolean; name: string; url: string }) {
    if (s.enabled) return true
    try {
      if (new URL(s.url).protocol !== 'https:' || !s.name.trim()) throw new Error()
      return true
    } catch {
      ElMessage.warning('请输入名称和有效的 HTTPS 地址')
      return false
    }
  }
  function removeSource(id: string) {
    if (activeConfig.value.scenes.some((s) => s.sourceIds.includes(id))) {
      ElMessage.warning('请先解除场景引用')
      return
    }
    activeConfig.value.sources = activeConfig.value.sources.filter((s) => s.id !== id)
  }
</script>
<style scoped lang="scss">
  .simple-settings {
    max-width: 820px;
    margin-top: 24px;
  }

  .setting-field {
    width: 100%;
  }

  .setting-field small,
  .field-hint {
    margin-left: 12px;
    color: var(--el-text-color-secondary);
  }

  .setting-field small {
    display: block;
    margin: 6px 0 0;
  }

  .workbench {
    overflow: hidden;
  }

  header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  h2,
  h3,
  h4 {
    margin: 0 0 10px;
  }

  p {
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .scene {
    padding: 22px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 12px;
    transition:
      border-color 0.18s,
      background-color 0.18s;
  }

  .scene.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  .scene small {
    display: block;
    margin-bottom: 12px;
    color: var(--el-color-primary);
  }

  section {
    padding: 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .issue {
    color: var(--el-color-danger);
  }

  pre {
    max-height: 65vh;
    overflow: auto;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  :deep(.el-select) {
    width: 100%;
  }

  @media (width <= 900px) {
    .cards {
      grid-template-columns: 1fr;
    }
  }
</style>
<style lang="scss">
  .management-dialog {
    display: flex;
    flex-direction: column;
    height: min(800px, 88dvh);
    margin: 0 auto;
  }

  .management-dialog > .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .narration-dialog {
    display: flex;
    flex-direction: column;
    height: min(900px, 92dvh);
  }

  .narration-dialog .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .narration-dialog .el-dialog__header,
  .narration-dialog .el-dialog__footer {
    flex-shrink: 0;
  }
</style>
