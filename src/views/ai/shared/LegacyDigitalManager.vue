<template>
  <div class="digital-page art-full-height">
    <ElAlert
      title="管理端预览：配置与发布记录保存在当前浏览器，不会下发设备。"
      type="info"
      :closable="false"
    />
    <div class="digital-toolbar"
      ><ElInput
        v-model="keyword"
        clearable
        placeholder="搜索数字人"
        style="width: 260px"
      /><ElSelect v-model="listStatus" style="width: 140px"
        ><ElOption label="使用中 / 草稿" value="active" /><ElOption
          label="已归档"
          value="archived" /></ElSelect
      ><ElButton type="primary" @click="edit()">新建数字人</ElButton></div
    >
    <ElCard shadow="never">
      <ElTable :data="filtered">
        <ElTableColumn label="数字人" min-width="220"
          ><template #default="{ row }"
            ><div class="identity"
              ><ElAvatar :src="row.avatar" :size="44" /><div
                ><b>{{ row.name }}</b
                ><small>{{ row.role }}</small></div
              ></div
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="草稿配置" min-width="230"
          ><template #default="{ row }"
            ><div>{{ modelName(row.modelId) }}</div
            ><small>{{
              (row.knowledgeIds || []).map(knowledgeName).join('、') || '未绑定知识库'
            }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn label="发布状态" width="160"
          ><template #default="{ row }"
            ><ElTag :type="row.publishedVersion ? 'success' : 'info'">{{
              row.publishedVersion ? `已发布 V${row.publishedVersion}` : '未发布'
            }}</ElTag
            ><small v-if="isDirty(row)">有未发布修改</small></template
          ></ElTableColumn
        >
        <ElTableColumn label="可用状态" width="120"
          ><template #default="{ row }"
            ><ElSwitch
              :model-value="row.status === 'enabled'"
              :disabled="!row.publishedVersion || row.archived"
              @change="row.status = $event ? 'enabled' : 'disabled'" /></template
        ></ElTableColumn>
        <ElTableColumn prop="updatedAt" label="更新时间" width="170"
          ><template #default="{ row }">{{
            formatDateTime(row.updatedAt)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="250" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="edit(row)">编辑草稿</ElButton
            ><ElButton link type="primary" @click="openRelease(row)">发布 / 版本</ElButton
            ><ElButton v-if="row.archived" link type="primary" @click="row.archived = false"
              >恢复</ElButton
            ><ElButton v-else-if="row.publishedVersion" link type="warning" @click="archive(row)"
              >归档</ElButton
            ><ElButton v-else link type="danger" @click="remove(row)">删除</ElButton></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>
    <ElDialog
      v-model="editorVisible"
      class="digital-config-dialog"
      :title="form.id ? '编辑数字人草稿' : '新建数字人'"
      width="min(1100px, 94vw)"
      :close-on-click-modal="false"
      :before-close="closeEditor"
      destroy-on-close
    >
      <ElAlert
        title="保存仅更新草稿；在“发布 / 版本”中检查并发布后，才形成新的生效配置。"
        :closable="false"
        type="info"
      />
      <ElTabs v-model="tab">
        <ElTabPane label="基础资料" name="base"
          ><ElForm label-width="110px">
            <ElFormItem label="数字人名称" required
              ><ElInput v-model="form.name" maxlength="60"
            /></ElFormItem>
            <ElFormItem label="形象"
              ><div class="avatar-options"
                ><ElAvatar :src="form.avatar" :size="72" /><ElRadioGroup v-model="form.avatar"
                  ><ElRadioButton v-for="(avatar, i) in avatars" :key="avatar" :value="avatar"
                    >形象 {{ i + 1 }}</ElRadioButton
                  ></ElRadioGroup
                ></div
              ></ElFormItem
            >
            <ElFormItem label="角色类型" required
              ><ElSelect v-model="form.role"
                ><ElOption
                  v-for="role in ['博物馆讲解员', '历史人物', '课堂助教']"
                  :key="role"
                  :value="role"
                  :label="role" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="角色介绍"
              ><ElInput
                v-model="form.description"
                type="textarea"
                :rows="4"
                maxlength="1000"
                show-word-limit
            /></ElFormItem>
            <ElFormItem label="备注"
              ><ElInput v-model="form.remark" type="textarea" :rows="2"
            /></ElFormItem> </ElForm
        ></ElTabPane>
        <ElTabPane label="AI 配置" name="ai"
          ><ElForm label-width="110px">
            <ElFormItem label="对话模型" required
              ><ElSelect v-model="form.modelId" filterable placeholder="选择模型管理中的对话模型"
                ><ElOption
                  v-for="m in aiState.models.filter((m) => m.purpose === 'chat')"
                  :key="m.id"
                  :value="m.id"
                  :label="m.name + (m.status === 'disabled' ? '（已停用）' : '')"
                  :disabled="m.status === 'disabled'" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="知识库" required
              ><ElSelect
                v-model="form.knowledgeIds"
                multiple
                filterable
                placeholder="支持多个知识库"
                ><ElOption
                  v-for="k in aiState.knowledge"
                  :key="k.id"
                  :value="k.id"
                  :label="k.name"
                  :disabled="k.status === 'disabled'" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="提示词" required
              ><ElSelect
                v-model="form.promptId"
                filterable
                @change="
                  form.promptVersion = aiState.prompt.find(
                    (p) => p.id === form.promptId
                  )?.publishedVersion
                "
                ><ElOption
                  v-for="p in aiState.prompt"
                  :key="p.id"
                  :value="p.id"
                  :label="p.name"
                  :disabled="p.status === 'disabled' || !p.publishedVersion" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="固定版本" required
              ><ElSelect v-model="form.promptVersion"
                ><ElOption
                  v-for="r in selectedPrompt?.releases || []"
                  :key="r.version"
                  :value="r.version"
                  :label="`V${r.version} · ${r.note}`" /></ElSelect
              ><p class="hint">发布后固定此版本，提示词更新不会自动替换已发布配置。</p></ElFormItem
            >
            <ElFormItem label="适用年龄段"
              ><ElSelect v-model="form.ageGroup"
                ><ElOption
                  v-for="age in ['全年龄', '小学低年级', '小学高年级', '初中', '高中及以上']"
                  :key="age"
                  :value="age"
                  :label="age" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="回答长度"
              ><ElRadioGroup v-model="form.answerLength"
                ><ElRadioButton
                  v-for="length in ['简短', '适中', '详细']"
                  :key="length"
                  :value="length"
                  >{{ length }}</ElRadioButton
                ></ElRadioGroup
              ></ElFormItem
            >
          </ElForm></ElTabPane
        >
        <ElTabPane label="欢迎与异常话术" name="scripts"
          ><ElAlert
            title="优先使用这里指定的话术；未指定时，按数字人专属 → 全局默认匹配。"
            :closable="false"
            type="info"
          />
          <ElForm label-width="140px"
            ><ElFormItem v-for="event in scriptEvents" :key="event.key" :label="event.label">
              <div class="script-choice"
                ><ElSelect v-model="form.scripts[event.key]" clearable placeholder="自动匹配"
                  ><ElOption
                    v-for="s in scriptOptions(event.key)"
                    :key="s.id"
                    :value="s.id"
                    :label="s.name" /></ElSelect
                ><p class="hint">{{
                  resolveScript(form, event.key)?.content ||
                  '未匹配到有效话术，请在话术管理中配置。'
                }}</p></div
              >
            </ElFormItem></ElForm
          >
        </ElTabPane>
        <ElTabPane label="配置预演" name="test"
          ><ElAlert
            title="只预演配置与话术选择，不调用模型或生成真实回答。"
            type="warning"
            :closable="false"
          /><ElSelect v-model="testEvent" style="margin: 16px 0"
            ><ElOption label="正常问答配置" value="answer" /><ElOption
              v-for="e in scriptEvents"
              :key="e.key"
              :label="e.label"
              :value="e.key"
          /></ElSelect>
          <div class="test-output" v-if="testEvent === 'answer'"
            ><p>模型：{{ modelName(form.modelId) }}</p
            ><p>知识库：{{ (form.knowledgeIds || []).map(knowledgeName).join('、') }}</p
            ><p>提示词：{{ selectedPrompt?.name || '未选择' }} / V{{ form.promptVersion || '-' }}</p
            ><p>适用年龄：{{ form.ageGroup }} · 回答长度：{{ form.answerLength }}</p></div
          >
          <div class="test-output" v-else
            ><p>{{ resolveScript(form, testEvent)?.content || '无匹配话术' }}</p
            ><small>后续动作：{{ actionName(resolveScript(form, testEvent)?.action) }}</small></div
          >
          <ElAlert
            v-for="issue in digitalIssues(form)"
            :key="issue"
            :title="issue"
            type="warning"
            :closable="false"
            style="margin-top: 8px"
          />
        </ElTabPane>
      </ElTabs>
      <template #footer
        ><ElButton @click="closeEditor(() => (editorVisible = false))">取消</ElButton
        ><ElButton type="primary" @click="saveDraft">保存草稿</ElButton></template
      >
    </ElDialog>
    <ElDialog
      v-model="releaseVisible"
      class="digital-config-dialog"
      title="数字人发布与版本"
      width="min(1100px, 94vw)"
      :close-on-click-modal="false"
    >
      <template v-if="selected">
        <ElAlert
          title="发布仅在当前浏览器保存版本快照，不会向设备发布。依赖的模型、提示词和话术内容会保留在该版本中。"
          type="info"
          :closable="false"
        />
        <ElTabs v-model="releaseTab"
          ><ElTabPane label="发布检查" name="check">
            <ElDescriptions :column="2" border
              ><ElDescriptionsItem label="数字人">{{ selected.name }}</ElDescriptionsItem
              ><ElDescriptionsItem label="当前版本">{{
                selected.publishedVersion ? `V${selected.publishedVersion}` : '未发布'
              }}</ElDescriptionsItem
              ><ElDescriptionsItem label="模型">{{
                modelName(selected.modelId)
              }}</ElDescriptionsItem
              ><ElDescriptionsItem label="知识库">{{
                (selected.knowledgeIds || []).map(knowledgeName).join('、')
              }}</ElDescriptionsItem></ElDescriptions
            >
            <ElTable :data="releaseDiff" style="margin: 16px 0"
              ><ElTableColumn prop="field" label="配置项" width="140" /><ElTableColumn
                prop="before"
                label="已发布" /><ElTableColumn prop="after" label="待发布"
            /></ElTable>
            <ElAlert
              v-for="issue in digitalIssues(selected)"
              :key="issue"
              :title="issue"
              type="error"
              :closable="false"
              style="margin: 8px 0"
            />
            <ElInput
              v-model="publishNote"
              type="textarea"
              :rows="2"
              maxlength="300"
              show-word-limit
              placeholder="填写本次发布说明"
            /> </ElTabPane
          ><ElTabPane label="历史版本" name="history">
            <ElEmpty v-if="!selected.releases?.length" description="尚未发布" />
            <ElTable v-else :data="selected.releases"
              ><ElTableColumn label="版本" width="100"
                ><template #default="{ row }">V{{ row.version }}</template></ElTableColumn
              ><ElTableColumn prop="note" label="发布说明" /><ElTableColumn
                label="发布时间"
                width="180"
                ><template #default="{ row }">{{ formatDateTime(row.at) }}</template></ElTableColumn
              ><ElTableColumn label="操作" width="230"
                ><template #default="{ row }"
                  ><ElButton link @click="snapshot = row">查看快照</ElButton
                  ><ElButton link type="primary" @click="restore(row)"
                    >恢复为草稿</ElButton
                  ></template
                ></ElTableColumn
              ></ElTable
            >
            <div v-if="snapshot" class="test-output"
              ><h3>V{{ snapshot.version }} · {{ snapshot.config.name }}</h3
              ><p>模型：{{ snapshot.resolved.model?.name }}</p
              ><p>知识库：{{ snapshot.resolved.knowledge?.map((k: any) => k.name).join('、') }}</p
              ><p>提示词正文：{{ snapshot.resolved.prompt?.config?.content }}</p
              ><p v-for="event in scriptEvents" :key="event.key"
                >{{ event.label }}：{{ snapshot.resolved.scripts?.[event.key]?.content }}</p
              ></div
            >
          </ElTabPane></ElTabs
        >
      </template>
      <template #footer
        ><ElButton @click="releaseVisible = false">关闭</ElButton
        ><ElButton
          v-if="releaseTab === 'check'"
          type="primary"
          :disabled="!selected || digitalIssues(selected).length > 0 || !publishNote.trim()"
          @click="publish"
          >发布新版本</ElButton
        ></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    aiState,
    clone,
    digitalConfig,
    digitalDependencies,
    digitalIssues,
    publishDigital,
    resolveScript,
    scriptEvents,
    type ConfigRow,
    type Release
  } from './ai-store'
  import { formatDateTime } from '@/utils/date'
  import avatar1 from '@/assets/images/avatar/avatar1.webp'
  import avatar2 from '@/assets/images/avatar/avatar2.webp'
  import avatar3 from '@/assets/images/avatar/avatar3.webp'
  defineOptions({ name: 'AiDigitalList' })
  const avatars = [avatar1, avatar2, avatar3]
  const listStatus = ref('active')
  const keyword = ref(''),
    editorVisible = ref(false),
    releaseVisible = ref(false),
    tab = ref('base'),
    releaseTab = ref('check'),
    testEvent = ref('answer'),
    publishNote = ref('')
  const form = reactive<Record<string, any>>({ scripts: {} }),
    selected = ref<ConfigRow>(),
    snapshot = ref<Release>()
  let initialForm = ''
  const filtered = computed(() =>
    aiState.digital.filter(
      (d) =>
        Boolean(d.archived) === (listStatus.value === 'archived') &&
        (d.name + d.role).includes(keyword.value.trim())
    )
  )
  const selectedPrompt = computed(() => aiState.prompt.find((p) => p.id === form.promptId))
  const modelName = (id: number) =>
    aiState.models.find((m) => m.id === id)?.name || '未配置 / 已移除'
  const knowledgeName = (id: number) =>
    aiState.knowledge.find((k) => k.id === id)?.name || '已移除知识库'
  const actionName = (v: string) =>
    ({ none: '无', retry: '重试', recommend: '推荐问题', home: '返回首页' })[v] || '无'
  function scriptOptions(event: string) {
    return aiState.script.filter(
      (s) =>
        s.status === 'enabled' &&
        s.event === event &&
        (s.scope === 'global' || s.digitalId === form.id)
    )
  }
  function currentRelease(row: ConfigRow) {
    return row.releases?.find((r: Release) => r.version === row.publishedVersion) as
      | Release
      | undefined
  }
  function isDirty(row: ConfigRow) {
    const r = currentRelease(row)
    return (
      !r ||
      JSON.stringify(digitalConfig(row)) !== JSON.stringify(r.config) ||
      JSON.stringify(digitalDependencies(row)) !== JSON.stringify(r.resolved)
    )
  }
  function edit(row?: ConfigRow) {
    Object.keys(form).forEach((k) => delete form[k])
    Object.assign(
      form,
      row
        ? clone(row)
        : {
            name: '',
            avatar: avatar1,
            role: '博物馆讲解员',
            description: '',
            modelId: aiState.models.find(
              (m) => m.purpose === 'chat' && m.isDefault && m.status === 'enabled'
            )?.id,
            knowledgeIds: [],
            scripts: {},
            ageGroup: '小学高年级',
            answerLength: '适中',
            status: 'disabled',
            remark: ''
          }
    )
    initialForm = JSON.stringify(form)
    tab.value = 'base'
    editorVisible.value = true
  }
  async function closeEditor(done: () => void) {
    if (JSON.stringify(form) !== initialForm) {
      try {
        await ElMessageBox.confirm('草稿尚未保存，确定放弃修改？', '未保存修改', {
          type: 'warning'
        })
      } catch {
        return
      }
    }
    done()
  }
  function saveDraft() {
    if (!form.name?.trim()) return void ElMessage.warning('请输入数字人名称')
    if (aiState.digital.some((d) => d.id !== form.id && d.name === form.name.trim()))
      return void ElMessage.warning('数字人名称已存在')
    const id = form.id || Math.max(0, ...aiState.digital.map((d) => d.id)) + 1
    const old = aiState.digital.find((d) => d.id === id)
    const saved = {
      ...clone(form),
      id,
      name: form.name.trim(),
      updatedAt: new Date().toISOString()
    } as ConfigRow
    if (old) Object.assign(old, saved)
    else aiState.digital.unshift({ ...saved, releases: [], publishedVersion: 0 })
    editorVisible.value = false
    ElMessage.success('草稿已保存，已发布版本保持不变')
  }
  function openRelease(row: ConfigRow) {
    selected.value = row
    publishNote.value = ''
    snapshot.value = undefined
    releaseTab.value = 'check'
    releaseVisible.value = true
  }
  const releaseDiff = computed(() => {
    if (!selected.value) return []
    const current = currentRelease(selected.value)
    const before = current?.config || {},
      after = selected.value
    const published = current?.resolved || {},
      pending = digitalDependencies(after)
    const fields = [
      ['name', '名称'],
      ['role', '角色'],
      ['description', '角色介绍'],
      ['ageGroup', '年龄段'],
      ['answerLength', '回答长度']
    ] as const
    return [
      ...fields.map(([key, field]) => ({
        field,
        before: before[key] || '未配置',
        after: after[key] || '未配置'
      })),
      {
        field: '对话模型',
        before: published.model?.name || '未配置',
        after: pending.model?.name || '未配置'
      },
      {
        field: '模型参数',
        before: modelParameters(published.model),
        after: modelParameters(pending.model)
      },
      {
        field: '知识库',
        before: published.knowledge?.map((k: any) => k.name).join('、') || '未配置',
        after: pending.knowledge?.map((k: any) => k.name).join('、') || '未配置'
      },
      {
        field: '提示词版本',
        before: published.prompt ? `V${published.prompt.version}` : '未配置',
        after: pending.prompt ? `V${pending.prompt.version}` : '未配置'
      },
      {
        field: '提示词正文',
        before: published.prompt?.config?.content || '未配置',
        after: pending.prompt?.config?.content || '未配置'
      },
      ...scriptEvents.map((event) => ({
        field: event.label,
        before: published.scripts?.[event.key]?.content || '未配置',
        after: pending.scripts?.[event.key]?.content || '未配置'
      }))
    ]
  })
  function modelParameters(model: any) {
    return model?.model
      ? `${model.model} · 最大输出 ${model.maxTokens} · 超时 ${model.timeout}s · Temperature ${model.temperature}`
      : '未配置'
  }
  function publish() {
    if (!selected.value) return
    try {
      const r = publishDigital(selected.value, publishNote.value)
      ElMessage.success(`已在本地发布 V${r.version}`)
      releaseTab.value = 'history'
    } catch (e) {
      ElMessage.error((e as Error).message)
    }
  }
  async function restore(release: Release) {
    if (!selected.value) return
    try {
      await ElMessageBox.confirm(
        `使用 V${release.version} 覆盖当前草稿？已发布版本不会改变。`,
        '恢复草稿'
      )
      Object.assign(selected.value, clone(release.config), { updatedAt: new Date().toISOString() })
      ElMessage.success('已恢复为草稿，可检查后重新发布')
      releaseTab.value = 'check'
    } catch {
      /* 用户取消 */
    }
  }
  async function archive(row: ConfigRow) {
    try {
      await ElMessageBox.confirm(
        '归档会停用该数字人，保留草稿和发布记录，可从已归档列表恢复。',
        '归档数字人'
      )
      row.archived = true
      row.status = 'disabled'
      ElMessage.success('数字人已归档')
    } catch {
      /* 用户取消 */
    }
  }
  async function remove(row: ConfigRow) {
    if (row.publishedVersion) return void ElMessage.warning('有发布历史的数字人请停用保留记录')
    if (aiState.script.some((s) => s.scope === 'digital' && s.digitalId === row.id))
      return void ElMessage.warning('请先调整该数字人的专属话术')
    try {
      await ElMessageBox.confirm(`删除未发布数字人“${row.name}”？`, '删除数字人')
      aiState.digital = aiState.digital.filter((d) => d.id !== row.id)
    } catch {
      /* 用户取消 */
    }
  }
</script>
<style scoped>
  :global(.digital-config-dialog) {
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }

  :global(.digital-config-dialog .el-dialog__body) {
    min-height: 0;
    overflow: auto;
  }

  :global(.digital-config-dialog .el-dialog__header),
  :global(.digital-config-dialog .el-dialog__footer) {
    flex-shrink: 0;
  }

  .digital-toolbar,
  .identity,
  .avatar-options {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  .digital-toolbar {
    justify-content: space-between;
    margin: 18px 0;
  }

  .identity small,
  small {
    display: block;
    margin-top: 5px;
    color: var(--el-text-color-secondary);
  }

  .hint {
    width: 100%;
    margin: 6px 0;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .script-choice {
    width: 100%;
  }

  .test-output {
    padding: 18px;
    margin-top: 16px;
    line-height: 1.8;
    white-space: pre-wrap;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  :deep(.el-tabs) {
    margin-top: 16px;
  }

  :deep(.el-select) {
    width: 100%;
  }

  :global(.el-dialog .digital-toolbar) {
    margin-top: 0;
  }
</style>
