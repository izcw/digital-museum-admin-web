<template><div ref="root" class="markdown-editor" /></template>
<script setup lang="ts">
  import { Crepe } from '@milkdown/crepe'
  import '@milkdown/crepe/theme/common/style.css'
  import '@milkdown/crepe/theme/frame.css'
  const props=defineProps<{modelValue:string}>(); const emit=defineEmits<{(e:'update:modelValue',value:string):void}>(); const root=ref<HTMLElement>(); let editor:Crepe|undefined
  onMounted(async()=>{if(!root.value)return;editor=new Crepe({root:root.value,defaultValue:props.modelValue});editor.on(listener=>listener.markdownUpdated((_ctx,value)=>emit('update:modelValue',value)));await editor.create()})
  onBeforeUnmount(()=>{void editor?.destroy()})
</script>
<style scoped>.markdown-editor{min-height:360px;border:1px solid var(--el-border-color);border-radius:8px;overflow:hidden}:deep(.milkdown){min-height:340px}</style>
