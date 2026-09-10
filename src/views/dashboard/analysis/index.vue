<!-- 分析页页面 -->
<template>
  <div>
    <ElRow :gutter="20">
      <ElCol :xl="14" :lg="15" :xs="24">
        <TodaySales />
      </ElCol>
      <ElCol :xl="10" :lg="9" :xs="24">
        <VisitorInsights />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :xl="10" :lg="10" :xs="24">
        <TotalRevenue />
      </ElCol>
      <ElCol :xl="7" :lg="7" :xs="24">
        <CustomerSatisfaction />
      </ElCol>
      <ElCol :xl="7" :lg="7" :xs="24">
        <TargetVsReality />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :xl="10" :lg="10" :xs="24">
        <TopProducts />
      </ElCol>
      <ElCol :xl="7" :lg="7" :xs="24">
        <SalesMappingByCountry />
      </ElCol>
      <ElCol :xl="7" :lg="7" :xs="24">
        <VolumeServiceLevel />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import TodaySales from './components/today-sales.vue'
  import VisitorInsights from './components/visitor-insights.vue'
  import TotalRevenue from './components/total-revenue.vue'
  import CustomerSatisfaction from './components/customer-satisfaction.vue'
  import TargetVsReality from './components/target-vs-reality.vue'
  import TopProducts from './components/top-products.vue'
  import SalesMappingByCountry from './components/sales-mapping-by-country.vue'
  import VolumeServiceLevel from './components/volume-service-level.vue'

  defineOptions({ name: 'Analysis' })
</script>
