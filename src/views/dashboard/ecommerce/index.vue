<!-- 电子商务页面 -->
<template>
  <div class="ecommerce">
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="16">
        <Banner />
      </ElCol>
      <ElCol :sm="12" :md="12" :lg="4">
        <TotalOrderVolume />
      </ElCol>
      <ElCol :sm="12" :md="12" :lg="4">
        <TotalProducts />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :sm="12" :md="12" :lg="8">
        <SalesTrend />
      </ElCol>
      <ElCol :sm="12" :md="12" :lg="8">
        <SalesClassification />
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="8">
        <ElRow :gutter="20">
          <ElCol :sm="24" :md="12" :lg="12">
            <ProductSales />
          </ElCol>
          <ElCol :sm="24" :md="12" :lg="12">
            <SalesGrowth />
          </ElCol>
          <ElCol :span="24" class="no-margin-bottom">
            <CartConversionRate />
          </ElCol>
        </ElRow>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="8">
        <HotCommodity />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="8">
        <AnnualSales />
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="8">
        <TransactionList />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :md="24" :lg="8">
        <RecentTransaction />
      </ElCol>
      <ElCol :md="24" :lg="16" class="no-margin-bottom">
        <HotProductsList />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import Banner from './components/banner.vue'
  import TotalOrderVolume from './components/total-order-volume.vue'
  import TotalProducts from './components/total-products.vue'
  import SalesTrend from './components/sales-trend.vue'
  import SalesClassification from './components/sales-classification.vue'
  import TransactionList from './components/transaction-list.vue'
  import HotCommodity from './components/hot-commodity.vue'
  import RecentTransaction from './components/recent-transaction.vue'
  import AnnualSales from './components/annual-sales.vue'
  import ProductSales from './components/product-sales.vue'
  import SalesGrowth from './components/sales-growth.vue'
  import CartConversionRate from './components/cart-conversion-rate.vue'
  import HotProductsList from './components/hot-products-list.vue'

  defineOptions({ name: 'Ecommerce' })
</script>
