<template>
  <section class="mt-6">
    <h3 class="mb-4 text-base font-medium">关联学校与联系人</h3>
    <ElSkeleton v-if="loading" :rows="4" animated />
    <ElEmpty v-else-if="error" :description="error">
      <ElButton type="primary" @click="load">重新加载</ElButton>
    </ElEmpty>
    <template v-else-if="details?.school">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="学校名称">{{ details.school.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="学校编码">{{ details.school.code }}</ElDescriptionsItem>
        <ElDescriptionsItem label="所属地区">{{ details.school.region || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="学校地址">{{
          details.school.address || '-'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="学校状态">
          <ElTag :type="details.school.status === 'enabled' ? 'success' : 'info'">
            {{ details.school.status === 'enabled' ? '启用' : '停用' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="学校备注">{{ details.school.remark || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <h4 class="mt-5 mb-3 font-medium">联系人（学校管理员）</h4>
      <ElTable :data="details.contacts" border empty-text="该学校暂无管理员联系人">
        <ElTableColumn prop="name" label="联系人" min-width="120">
          <template #default="{ row }">{{ row.name || '未填写姓名' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="phone" label="联系电话" min-width="160">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <ElTableColumn label="账号状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ row.status === 'enabled' ? '启用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
    <ElEmpty v-else description="设备尚未关联学校，可在编辑设备中选择学校" />
  </section>
</template>

<script setup lang="ts">
  import { apiServerRequest } from '@/api/auth'
  import { schoolError } from '@/views/school/shared/school-data'

  const props = defineProps<{ deviceId: number }>()
  interface SchoolDetails {
    school: {
      id: number
      name: string
      code: string
      region: string
      address: string
      status: string
      remark: string | null
    } | null
    contacts: Array<{ id: number; name: string; phone: string; email: string; status: string }>
  }
  const details = ref<SchoolDetails>()
  const loading = ref(false)
  const error = ref('')
  let requestVersion = 0
  const load = async () => {
    const version = ++requestVersion
    loading.value = true
    error.value = ''
    details.value = undefined
    try {
      const { data } = await apiServerRequest.get<SchoolDetails>(
        `/devices/${props.deviceId}/school`,
        { timeout: 15000 }
      )
      if (version === requestVersion) details.value = data
    } catch (cause) {
      if (version === requestVersion) error.value = schoolError(cause, '学校及联系人信息加载失败')
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }
  watch(() => props.deviceId, load, { immediate: true })
  onBeforeUnmount(() => {
    requestVersion++
  })
</script>
