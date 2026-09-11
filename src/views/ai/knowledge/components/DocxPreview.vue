<template><div class="docx-preview" v-loading="loading"><ElAlert v-if="error" :title="error" type="warning" :closable="false"/><article v-else v-html="html" /></div></template>
<script setup lang="ts">
  import mammoth from 'mammoth/mammoth.browser'
  const props=defineProps<{src:string;fallback?:string}>();const html=ref(''),loading=ref(false),error=ref('')
  async function load(){if(!props.src){html.value=`<p>${props.fallback||'暂无文档文件，替换资源后即可预览。'}</p>`;return}loading.value=true;try{const data=await fetch(props.src).then(r=>r.arrayBuffer());html.value=(await mammoth.convertToHtml({arrayBuffer:data})).value}catch{error.value='DOCX 加载失败，请下载原文件检查。'}finally{loading.value=false}}
  onMounted(load);watch(()=>props.src,load)
</script>
<style scoped>.docx-preview article{min-height:360px;padding:28px;line-height:1.8;background:white;color:#222;border-radius:6px}.docx-preview :deep(img){max-width:100%}</style>
