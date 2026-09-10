<!-- 工作台页面 -->
<template>
  <div>
    <CardList></CardList>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="10">
        <ActiveUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="14">
        <SalesOverview />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <NewUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <Dynamic />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <TodoList />
      </ElCol>
    </ElRow>

    <AboutProject />
  </div>
</template>

<script setup lang="ts">
  import CardList from './components/card-list.vue'
  import ActiveUser from './components/active-user.vue'
  import SalesOverview from './components/sales-overview.vue'
  import NewUser from './components/new-user.vue'
  import Dynamic from './components/dynamic-stats.vue'
  import TodoList from './components/todo-list.vue'
  import AboutProject from './components/about-project.vue'

  defineOptions({ name: 'Console' })
</script>
