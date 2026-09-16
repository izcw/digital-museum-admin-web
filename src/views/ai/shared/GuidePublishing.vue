<template>
  <ElCard shadow="never" class="guide-publishing">
    <template #header
      ><header
        ><b>数字人发布 · {{ guide?.name }}</b
        ><ElTag>{{
          records.length ? '有发布记录，编辑仅修改草稿' : '未发布，客户端不可选'
        }}</ElTag></header
      ></template
    >
    <ElAlert
      title="独立发布当前数字人的形象、音色、应用配置及引用快照。指定学校版本优先；其他数字人不受影响。仅本地模拟。"
      :closable="false"
    />
    <p v-for="issue in configurationIssues" :key="issue" class="error">{{ issue }}</p>
    <ElForm label-width="110px">
      <ElFormItem label="发布范围"
        ><ElRadioGroup v-model="scope"
          ><ElRadioButton value="all">全部学校</ElRadioButton
          ><ElRadioButton value="schools">指定学校</ElRadioButton></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem v-if="scope === 'schools'" label="选择学校"
        ><ElSelect
          v-model="schoolIds"
          multiple
          filterable
          :loading="loading"
          placeholder="选择学校，可多选"
          ><ElOption
            v-for="school in schools"
            :key="school.id"
            :value="school.id"
            :label="school.name + '（' + school.code + '）'" /></ElSelect
        ><ElButton link @click="loadSchools">刷新学校</ElButton
        ><span v-if="error" class="error">{{ error }}</span></ElFormItem
      >
      <ElFormItem label="发布说明"
        ><ElInput v-model="note" placeholder="例如：为某学校定制校服形象与欢迎设定"
      /></ElFormItem>
      <ElFormItem
        ><ElButton
          type="primary"
          :disabled="!guide || !note.trim() || (scope === 'schools' && !schoolIds.length)"
          @click="publish"
          >发布当前草稿</ElButton
        ><span>全部学校包含后续新增学校；学校专属版本保持优先。</span></ElFormItem
      >
    </ElForm>
    <ElTable :data="records" empty-text="尚未发布，保存草稿不会开放给客户端">
      <ElTableColumn label="版本" width="90"
        ><template #default="{ row }">V{{ row.version }}</template></ElTableColumn
      >
      <ElTableColumn label="范围"
        ><template #default="{ row }">{{
          row.scope === 'all' ? '全部学校' : schoolNames(row)
        }}</template></ElTableColumn
      >
      <ElTableColumn prop="note" label="发布说明" /><ElTableColumn prop="at" label="时间" />
      <ElTableColumn label="操作" width="170"
        ><template #default="{ row }"
          ><ElButton link @click="view(row)">查看版本</ElButton
          ><ElTag v-if="sceneState.withdrawnGuideReleases.includes(row.id)" type="info"
            >已撤回</ElTag
          ><ElButton v-else link type="danger" @click="withdraw(row)">撤回</ElButton></template
        ></ElTableColumn
      >
    </ElTable>
    <ElDialog v-model="snapshotOpen" title="数字人发布版本 · 只读" width="min(900px, 94vw)">
      <pre>{{ snapshot }}</pre>
    </ElDialog>
  </ElCard>
</template>
<script setup lang="ts">
  import { computed, ref, onMounted, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    sceneState,
    publishGuide,
    guideConfigurationIssues,
    type GuideRelease
  } from './scene-store'
  import { schools, loadSchoolOptions } from '../../school/shared/school-data'
  const props = defineProps<{ guideId: string }>()
  const guide = computed(() => sceneState.identities.find((p) => p.id === props.guideId))
  const configurationIssues = computed(() => guideConfigurationIssues(props.guideId))
  const records = computed(() =>
    sceneState.guideReleases.filter((r) => r.guideId === props.guideId)
  )
  const scope = ref<'all' | 'schools'>('schools'),
    schoolIds = ref<string[]>([]),
    note = ref(''),
    loading = ref(false),
    error = ref('')
  const snapshotOpen = ref(false),
    snapshot = ref('')
  watch(
    () => props.guideId,
    () => {
      note.value = ''
      schoolIds.value = []
      scope.value = 'schools'
    }
  )
  async function loadSchools() {
    loading.value = true
    error.value = ''
    try {
      await loadSchoolOptions()
    } catch {
      error.value = '学校列表加载失败，请刷新后重试；未使用虚构学校。'
    } finally {
      loading.value = false
    }
  }
  onMounted(loadSchools)
  async function publish() {
    const targets = schools
      .filter((s) => schoolIds.value.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name }))
    if (scope.value === 'schools' && targets.length !== schoolIds.value.length) {
      ElMessage.warning('学校选择已失效，请重新选择')
      return
    }
    const guideId = props.guideId,
      range = scope.value,
      description = note.value
    try {
      await ElMessageBox.confirm(
        `发布“${guide.value?.name}”到${range === 'all' ? '全部学校（含后续新增学校）' : targets.map((s) => s.name).join('、')}？已发布版本不会随草稿编辑而变化。`,
        '确认发布范围'
      )
      const release = publishGuide(guideId, range, targets, description)
      note.value = ''
      ElMessage.success(`本地发布 V${release.version} 已保存，未实际下发客户端`)
    } catch (e) {
      if (e instanceof Error) ElMessage.error(e.message)
    }
  }
  function schoolNames(row: GuideRelease) {
    return row.schools.map((s) => s.name).join('、')
  }
  function view(row: GuideRelease) {
    snapshot.value = JSON.stringify(row, null, 2)
    snapshotOpen.value = true
  }
  async function withdraw(row: GuideRelease) {
    try {
      await ElMessageBox.confirm(
        '撤回后，该版本覆盖的学校将不能使用此数字人，不会自动回退旧版或全部学校版。重新发布可恢复开放。',
        '撤回发布'
      )
      sceneState.withdrawnGuideReleases.push(row.id)
    } catch {
      /* cancelled */
    }
  }
</script>
<style scoped lang="scss">
  .guide-publishing {
    margin-top: 20px;
  }

  header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .el-form {
    margin-top: 20px;
  }

  .error {
    color: var(--el-color-danger);
  }

  pre {
    max-height: 65vh;
    overflow: auto;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
