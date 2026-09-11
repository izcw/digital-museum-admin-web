<template><div class="pdf-preview"><ElAlert v-if="error" :title="error" type="warning" :closable="false"/><div ref="pages" class="pages" /></div></template>
<script setup lang="ts">
  import * as pdfjs from 'pdfjs-dist'
  import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
  pdfjs.GlobalWorkerOptions.workerSrc=workerUrl
  const props=defineProps<{src:string}>(); const pages=ref<HTMLElement>(); const error=ref('')
  async function render(){if(!pages.value)return;pages.value.innerHTML='';if(!props.src){error.value='暂无可预览的 PDF 文件，替换资源后即可使用 PDF.js 查看。';return}try{const pdf=await pdfjs.getDocument({url:props.src}).promise;for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const viewport=page.getViewport({scale:1.25});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;pages.value.append(canvas);await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise}}catch{error.value='PDF 加载失败，请检查文件是否完整。'}}
  onMounted(render);watch(()=>props.src,render)
</script>
<style scoped>.pages{display:grid;gap:16px;justify-content:center}.pages :deep(canvas){max-width:100%;height:auto;box-shadow:0 2px 12px rgb(0 0 0/12%)}</style>
