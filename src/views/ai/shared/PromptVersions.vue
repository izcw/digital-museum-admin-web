<template>
  <div class="prompt-versions">
    <ElAlert
      title="保存正文只更新草稿；发布生成固定版本，数字人仍使用其原先选择的版本。"
      type="info"
      :closable="false"
    />
    <ElInput v-model="note" placeholder="本次修改说明" maxlength="300" style="margin: 12px 0" />
    <ElButton type="primary" :disabled="!note.trim() || !row.content?.trim()" @click="publish"
      >发布提示词版本</ElButton
    >
    <ElTable :data="row.releases || []" style="margin-top: 16px"
      ><ElTableColumn label="版本" width="80"
        ><template #default="{ row: r }">V{{ r.version }}</template></ElTableColumn
      ><ElTableColumn prop="note" label="说明" /><ElTableColumn label="操作" width="180"
        ><template #default="{ row: r }"
          ><ElButton link @click="compare = r">对比</ElButton
          ><ElButton link type="primary" @click="restore(r)">恢复草稿</ElButton></template
        ></ElTableColumn
      ></ElTable
    >
    <div v-if="compare" class="compare"
      ><section
        ><h4>V{{ compare.version }}</h4
        ><pre>{{ compare.config.content }}</pre></section
      ><section
        ><h4>当前草稿</h4><pre>{{ row.content }}</pre>
      </section></div
    >
  </div>
</template>
<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { clone, type ConfigRow, type Release } from './ai-store'
  const props = defineProps<{ row: ConfigRow }>()
  const note = ref(''),
    compare = ref<Release>()
  function publish() {
    const row = props.row
    const names = [
      ...new Set(
        Array.from(String(row.content).matchAll(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g), (m) => m[1])
      )
    ]
    if (names.some((name) => !row.variableDefs?.some((v: any) => v.name === name)))
      return void ElMessage.warning('请先在编辑中保存模板变量定义')
    const version = Math.max(0, ...(row.releases || []).map((r: Release) => r.version)) + 1
    row.releases ??= []
    row.releases.unshift({
      version,
      at: new Date().toISOString(),
      note: note.value.trim(),
      config: clone({
        content: row.content,
        variableDefs: row.variableDefs || [],
        scene: row.scene
      }),
      resolved: {}
    })
    row.version = `V${version}`
    row.publishedVersion = version
    row.updatedAt = new Date().toISOString()
    note.value = ''
    ElMessage.success(`已在本地发布 V${version}`)
  }
  async function restore(r: Release) {
    try {
      await ElMessageBox.confirm(`使用 V${r.version} 覆盖草稿？不会改变已发布内容。`, '恢复草稿')
      Object.assign(props.row, clone(r.config), { updatedAt: new Date().toISOString() })
      ElMessage.success('已恢复草稿')
    } catch {
      /* 用户取消 */
    }
  }
</script>
<style scoped>
  .prompt-versions {
    margin-top: 20px;
  }

  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }

  .compare section {
    min-width: 0;
    padding: 12px;
    background: var(--el-fill-color-light);
  }

  pre {
    word-break: break-word;
    white-space: pre-wrap;
  }
</style>
