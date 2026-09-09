<template>
  <ElDrawer
    v-model="visible"
    title="学校详情"
    direction="rtl"
    size="min(860px, 100vw)"
    destroy-on-close
  >
    <ElSkeleton v-if="loading" :rows="8" animated />
    <ElEmpty v-else-if="loadError" :description="loadError"
      ><ElButton @click="loadDetail">重试</ElButton></ElEmpty
    >
    <template v-else-if="school">
      <ElDescriptions title="学校信息" :column="width < 600 ? 1 : 2" border>
        <ElDescriptionsItem label="学校名称">{{ school.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="学校编码">{{ school.code }}</ElDescriptionsItem>
        <ElDescriptionsItem label="所在地区">{{ school.region }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="school.status === 'enabled' ? 'success' : 'info'">
            {{ school.status === 'enabled' ? '启用' : '停用' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="学校地址" :span="2">{{ school.address }}</ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">{{
          formatDateTime(school.createTime)
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">{{
          formatDateTime(school.updateTime)
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="备注" :span="2">{{ school.remark || '—' }}</ElDescriptionsItem>
      </ElDescriptions>

      <section class="mt-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-base font-semibold">关联学校管理员</h3>
          <div class="flex items-center gap-3">
            <ElTag type="info">共 {{ adminTotal }} 人</ElTag>
            <ElButton
              type="primary"
              v-if="canManageAdmins"
              :disabled="school.status === 'disabled'"
              :title="school.status === 'disabled' ? '请先启用学校再新增管理员' : '新增管理员'"
              @click="openAdmin()"
              >新增管理员</ElButton
            >
          </div>
        </div>
        <ElTable v-if="relatedAdmins.length" :data="relatedAdmins" row-key="id" border>
          <ElTableColumn prop="userName" label="用户名" min-width="160" show-overflow-tooltip />
          <ElTableColumn prop="name" label="姓名" min-width="100" show-overflow-tooltip />
          <ElTableColumn prop="phone" label="联系电话" min-width="170" show-overflow-tooltip />
          <ElTableColumn prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
          <ElTableColumn prop="status" label="状态" width="90">
            <template #default="{ row }">
              <ElTag :type="row.status === 'enabled' ? 'success' : 'info'">
                {{ row.status === 'enabled' ? '启用' : '停用' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          <ElTableColumn v-if="canManageAdmins" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="openAdmin(row)">编辑</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
        <ElPagination
          v-if="adminTotal > adminSize"
          class="mt-4"
          small
          layout="prev, pager, next, total"
          :total="adminTotal"
          :page-size="adminSize"
          :current-page="adminPage"
          @current-change="changeAdminPage"
        />
        <ElEmpty
          v-if="!relatedAdmins.length"
          :description="
            school.status === 'disabled'
              ? '暂无关联管理员，请先启用学校再添加'
              : '暂无关联管理员，可点击上方新增管理员添加'
          "
        />
      </section>
    </template>
    <ElEmpty v-else description="学校信息不存在" />
    <template #footer>
      <ElButton @click="visible = false">关闭</ElButton>
    </template>
  </ElDrawer>
  <AdminDialog
    v-model:visible="adminVisible"
    :row="currentAdmin"
    :default-school-id="schoolId"
    :loading="saving"
    @submit="saveAdmin"
  />
</template>

<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core'
  import { ElMessage } from 'element-plus'
  import { formatDateTime } from '@/utils/date'
  import {
    getSchool,
    listSchoolAdmins,
    saveSchoolAdmin,
    schoolError,
    type School,
    type SchoolAdmin,
    type AdminMutation
  } from '../../shared/school-data'
  import { useUserStore } from '@/store/modules/user'
  import AdminDialog from '../../admin/modules/edit-dialog.vue'

  const props = defineProps<{ schoolId: string }>()
  const visible = defineModel<boolean>('visible', { required: true })
  const emit = defineEmits<{ saved: [] }>()
  const adminVisible = ref(false)
  const currentAdmin = ref<SchoolAdmin>()
  const { width } = useWindowSize()
  const school = ref<School>()
  const relatedAdmins = ref<SchoolAdmin[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const adminPage = ref(1)
  const adminSize = 20
  const adminTotal = ref(0)
  const userStore = useUserStore()
  const canManageAdmins = computed(
    () =>
      !userStore.info.schoolId &&
      (userStore.info.buttons?.includes('*') ||
        userStore.info.buttons?.includes('menu:school-admin'))
  )
  let requestVersion = 0
  async function loadDetail() {
    const version = ++requestVersion
    loading.value = true
    loadError.value = ''
    try {
      const [detail, page] = await Promise.all([
        getSchool(props.schoolId),
        listSchoolAdmins(props.schoolId, adminPage.value, adminSize)
      ])
      if (version !== requestVersion) return
      school.value = detail
      relatedAdmins.value = page.records
      adminTotal.value = page.total
      if (adminPage.value > 1 && !page.records.length) {
        adminPage.value--
        await loadDetail()
      }
    } catch (error) {
      if (version === requestVersion) loadError.value = schoolError(error, '学校详情加载失败')
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }
  function changeAdminPage(page: number) {
    adminPage.value = page
    loadDetail()
  }
  function openAdmin(row?: SchoolAdmin) {
    currentAdmin.value = row ? { ...row } : undefined
    adminVisible.value = true
  }
  async function saveAdmin(payload: AdminMutation) {
    if (saving.value) return
    saving.value = true
    try {
      await saveSchoolAdmin(payload, currentAdmin.value?.id)
      adminVisible.value = false
      ElMessage.success('学校管理员已保存')
      await loadDetail()
      emit('saved')
    } catch (error) {
      ElMessage.error(schoolError(error))
    } finally {
      saving.value = false
    }
  }
  watch(
    () => [visible.value, props.schoolId] as const,
    ([value]) => {
      if (!value) {
        requestVersion++
        adminVisible.value = false
        return
      }
      school.value = undefined
      relatedAdmins.value = []
      adminPage.value = 1
      loadDetail()
    }
  )
</script>
