<template>
  <div class="art-full-height"
    ><div class="tag-toolbar"
      ><ElInput v-model="keyword" clearable placeholder="搜索标签" style="width: 260px" /><ElButton
        type="primary"
        @click="edit()"
        >新增标签</ElButton
      ></div
    ><ElCard
      ><ElTable :data="filtered"
        ><ElTableColumn label="标签" min-width="180"
          ><template #default="{ row }"
            ><ElTag :style="{ borderColor: row.color, color: row.color }">{{
              row.name
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="关联资源" width="120"
          ><template #default="{ row }">{{ count(row.name) }}</template></ElTableColumn
        ><ElTableColumn prop="remark" label="说明" /><ElTableColumn label="操作" width="150"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="edit(row)">编辑</ElButton
            ><ElButton link type="danger" @click="remove(row)">删除</ElButton></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    ><ElDialog
      v-model="visible"
      :title="form.id ? '编辑标签' : '新增标签'"
      width="520px"
      :close-on-click-modal="false"
      ><ElForm label-width="90px"
        ><ElFormItem label="名称" required
          ><ElInput v-model="form.name" maxlength="30" /></ElFormItem
        ><ElFormItem label="颜色"><ElColorPicker v-model="form.color" /></ElFormItem
        ><ElFormItem label="说明"
          ><ElInput v-model="form.remark" type="textarea" :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="visible = false">取消</ElButton
        ><ElButton type="primary" @click="save">保存</ElButton></template
      ></ElDialog
    ></div
  >
</template>
<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { aiState, clone } from '../../shared/ai-store'
  defineOptions({ name: 'AiKnowledgeTag' })
  type Tag = (typeof aiState.tags)[number]
  const keyword = ref(''),
    visible = ref(false),
    form = reactive<Partial<Tag>>({})
  const allResources = computed(() => Object.values(aiState.resourcesByBase).flat())
  const filtered = computed(() => aiState.tags.filter((t) => t.name.includes(keyword.value.trim())))
  const count = (name: string) =>
    allResources.value.filter((r) => r.tags?.split(',').includes(name)).length
  function edit(row?: Tag) {
    Object.assign(
      form,
      { id: undefined, name: '', color: '#409eff', remark: '' },
      row ? clone(row) : {}
    )
    visible.value = true
  }
  function save() {
    const name = form.name?.trim()
    if (!name) return void ElMessage.warning('请输入标签名称')
    if (aiState.tags.some((t) => t.id !== form.id && t.name === name))
      return void ElMessage.warning('标签名称已存在')
    const existing = aiState.tags.find((t) => t.id === form.id)
    if (existing) {
      const old = existing.name
      allResources.value.forEach((r) => {
        r.tags = (r.tags?.split(',') || []).map((n: string) => (n === old ? name : n)).join(',')
      })
      Object.assign(existing, form, { name })
    } else
      aiState.tags.push({
        id: Math.max(0, ...aiState.tags.map((t) => t.id)) + 1,
        name,
        color: form.color || '#409eff',
        remark: form.remark || ''
      })
    visible.value = false
    ElMessage.success('标签已保存，资源引用同步更新')
  }
  async function remove(row: Tag) {
    if (count(row.name)) return void ElMessage.warning('请先在资源中移除该标签')
    try {
      await ElMessageBox.confirm(`删除标签“${row.name}”？`, '删除标签')
      aiState.tags = aiState.tags.filter((t) => t.id !== row.id)
    } catch {
      /* 用户取消 */
    }
  }
</script>
<style scoped>
  .tag-toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
</style>
