<template>
  <ElCard class="art-full-height">
    <ElEmpty :description="`${title}功能建设中`">
      <p class="mb-5 text-sm text-gray-500">该功能已规划，业务页面尚未上线。</p>
      <ElButton @click="router.back()">返回上一页</ElButton>
    </ElEmpty>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  const route = useRoute()
  const router = useRouter()
  const title = computed(() => String(route.meta.title || '当前'))
</script>
