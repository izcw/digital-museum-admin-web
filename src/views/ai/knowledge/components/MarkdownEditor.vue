<template><div ref="root" class="markdown-editor" /></template>
<script setup lang="ts">
  import { Crepe } from '@milkdown/crepe'
  import '@milkdown/crepe/theme/common/style.css'
  import '@milkdown/crepe/theme/frame.css'
  const props = defineProps<{ modelValue: string; readonly?: boolean }>()
  const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
  const root = ref<HTMLElement>()
  let editor: Crepe | undefined
  onMounted(async () => {
    if (!root.value) return
    editor = new Crepe({ root: root.value, defaultValue: props.modelValue })
    editor.setReadonly(Boolean(props.readonly))
    editor.on((listener) =>
      listener.markdownUpdated((_ctx, value) => {
        if (!props.readonly) emit('update:modelValue', value)
      })
    )
    await editor.create()
  })
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
