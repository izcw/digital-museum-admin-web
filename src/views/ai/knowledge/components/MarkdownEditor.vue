<template><div ref="root" class="markdown-editor" /></template>
<script setup lang="ts">
  import { Crepe } from '@milkdown/crepe'
  import '@milkdown/crepe/theme/common/style.css'
  import '@milkdown/crepe/theme/frame.css'
  const props = defineProps<{ modelValue: string; readonly?: boolean }>()
  const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
  const root = ref<HTMLElement>()
  let editor: Crepe | undefined

  async function createEditor(defaultValue: string) {
    if (!root.value) return
    const instance = new Crepe({ root: root.value, defaultValue })
    editor = instance
    editor.setReadonly(Boolean(props.readonly))
    editor.on((listener) =>
      listener.markdownUpdated((_ctx, value) => {
        if (!props.readonly) emit('update:modelValue', value)
      })
    )
    await editor.create()
  }

  onMounted(async () => {
    await createEditor(props.modelValue)
  })

  watch(
    () => props.modelValue,
    async (value) => {
      if (!editor || editor.getMarkdown() === value) return
      const previous = editor
      editor = undefined
      await previous.destroy()
      await createEditor(value)
    }
  )

  watch(
    () => props.readonly,
    (value) => editor?.setReadonly(Boolean(value))
  )

  onBeforeUnmount(() => {
    void editor?.destroy()
  })
</script>
<style scoped>
  .markdown-editor {
    min-height: 360px;
    overflow: hidden;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  :deep(.milkdown) {
    min-height: 340px;
  }
</style>
