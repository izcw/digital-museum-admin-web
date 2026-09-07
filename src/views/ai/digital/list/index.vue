<template>
  <div class="pt-5">
    <h1 class="page-title">卡片横幅</h1>
    <ElRow :gutter="20">
      <ElCol :xs="24" :sm="12" :md="12" :lg="6" class="mb-5">
        <ArtCardBanner
          title="系统运行正常"
          description="所有核心服务运行稳定，响应时间在正常范围内。"
        />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'TemplateBanners' })
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  .page-title {
    @apply my-5 text-xl font-medium first:mt-0;
  }
</style>
