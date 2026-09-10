<template>
  <div v-loading="devicesLoading" class="device-list-page page-content art-full-height">
    <section class="overview-grid">
      <div v-for="item in overviewItems" :key="item.label" class="overview-card">
        <div class="overview-icon" :class="item.className"><ArtSvgIcon :icon="item.icon" /></div>
        <div
          ><div class="overview-value">{{ item.value }}</div
          ><div class="overview-label">{{ item.label }}</div></div
        >
      </div>
    </section>

    <ElAlert
      v-if="realtimeError"
      :title="realtimeError"
      type="warning"
      :closable="false"
      show-icon
      class="realtime-alert"
    />

    <ElCard class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-fields">
          <ElInput
            v-model="searchForm.keyword"
            clearable
            :prefix-icon="Search"
            placeholder="搜索设备名称、编号或序列号"
            @keyup.enter="handleSearch"
          />
          <ElSelect
            v-model="searchForm.schoolId"
            clearable
            filterable
            placeholder="全部学校"
            :loading="schoolsLoading"
          >
            <ElOption label="未关联学校" :value="0" />
            <ElOption
              v-for="school in deviceSchools"
              :key="school.id"
              :label="school.name"
              :value="school.id"
            />
          </ElSelect>
          <ElSelect v-model="searchForm.modelId" clearable placeholder="全部型号">
            <ElOption
              v-for="item in deviceModels"
              :key="item.id"
              :label="item.modelName"
              :value="item.id"
            />
          </ElSelect>
          <ElSelect v-model="searchForm.tagId" clearable filterable placeholder="全部标签">
            <ElOption v-for="tag in deviceTags" :key="tag.id" :label="tag.name" :value="tag.id" />
          </ElSelect>
          <ElSelect v-model="searchForm.onlineStatus" clearable placeholder="全部在线状态">
            <ElOption label="在线" value="online" />
            <ElOption label="离线" value="offline" />
            <ElOption label="未激活" value="unknown" />
          </ElSelect>
        </div>
        <div class="filter-actions">
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
          <ElButton v-ripple @click="openDialog('add')">新增设备</ElButton>
        </div>
      </div>
    </ElCard>

    <div v-if="pagedDevices.length" class="device-grid">
      <article
        v-for="item in pagedDevices"
        :key="item.id"
        class="device-card"
        @contextmenu.prevent.stop="showDeviceMenu($event, item)"
      >
        <div class="device-main">
          <div class="device-cover">
            <ElImage :src="getModelImage(item.modelId)" fit="contain" lazy>
              <template #error>
                <div class="image-placeholder"><ArtSvgIcon icon="ri:device-line" /></div>
              </template>
            </ElImage>

            <span v-if="item.status === 'disabled'" class="disabled-mask">停用</span>
          </div>

          <div class="device-content">
            <div class="device-heading">
              <div class="min-w-0">
                <h3 :title="item.deviceName">{{ item.deviceName }}</h3>
                <p>{{ item.deviceCode }}</p>
              </div>
              <ElDropdown
                trigger="click"
                @command="(command: string) => handleCommand(command, item)"
              >
                <button class="more-button" aria-label="更多操作">
                  <ArtSvgIcon icon="ri:more-2-fill" />
                </button>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="monitor">
                      <ArtSvgIcon icon="ri:dashboard-3-line" class="mr-2" />设备监控
                    </ElDropdownItem>
                    <ElDropdownItem command="detail">
                      <ArtSvgIcon icon="ri:eye-line" class="mr-2" />查看详情
                    </ElDropdownItem>
                    <ElDropdownItem
                      v-if="item.id >= 1_000_000_000"
                      command="reset-connection"
                      divided
                    >
                      <ArtSvgIcon icon="ri:key-2-line" class="mr-2" />重置设备连接
                    </ElDropdownItem>
                    <ElDropdownItem command="edit">
                      <ArtSvgIcon icon="ri:edit-2-line" class="mr-2" />编辑设备
                    </ElDropdownItem>
                    <ElDropdownItem command="delete" divided>
                      <span class="text-danger">
                        <ArtSvgIcon icon="ri:delete-bin-4-line" class="mr-2" />删除设备
                      </span>
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>

            <div class="device-meta">
              <div
                ><ArtSvgIcon icon="ri:school-line" /><span :title="item.schoolName">{{
                  item.schoolName || '未关联学校'
                }}</span></div
              >
              <div>
                <ArtSvgIcon icon="ri:barcode-line" />
                <span :title="item.serialNumber">序列号：{{ item.serialNumber || '未录入' }}</span>
              </div>
              <div>
                <ArtSvgIcon icon="ri:cpu-line" />
                <span>{{ getModelName(item.modelId) }}</span>
              </div>
              <div>
                <ArtSvgIcon icon="ri:price-tag-3-line" />
                <span>{{ item.tags?.map((tag) => tag.name).join('、') || '未设置标签' }}</span>
              </div>
              <div>
                <ArtSvgIcon icon="ri:map-pin-line" />
                <span>{{ item.location || '未填写安装位置' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="device-footer">
          <div class="device-status-group">
            <span class="status-text" :class="`is-${item.onlineStatus}`">
              {{ ONLINE_CONFIG[item.onlineStatus].label }}
            </span>
            <span class="status-text" :class="{ 'is-disabled': item.status === 'disabled' }">
              {{ item.status === 'enabled' ? '已启用' : '已停用' }}
            </span>
          </div>
          <div class="device-actions">
            <ElButton size="small" @click="openMonitor(item)">
              <ArtSvgIcon icon="ri:dashboard-3-line" class="mr-1" />设备监控
            </ElButton>
            <ElButton size="small" @click="handleCommand('detail', item)">
              <ArtSvgIcon icon="ri:eye-line" class="mr-1" />查看详情
            </ElButton>
          </div>
        </div>
      </article>
    </div>
    <ElCard v-else class="empty-card" shadow="never">
      <ElEmpty :description="devicesFailed ? '设备加载失败，请重试' : '没有符合条件的设备'">
        <ElButton v-if="devicesFailed" type="primary" @click="refreshDevices()">重新加载</ElButton>
      </ElEmpty>
    </ElCard>

    <div v-if="filteredDevices.length" class="pagination-wrap">
      <ElPagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        background
        :page-sizes="[8, 12, 20, 40]"
        layout="total, prev, pager, next, sizes, jumper"
        :total="filteredDevices.length"
      />
    </div>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增设备' : '编辑设备'"
      width="720px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      @closed="formRef?.resetFields()"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="12"
            ><ElFormItem label="设备名称" prop="deviceName"
              ><ElInput
                v-model="form.deviceName"
                maxlength="80"
                placeholder="请输入设备名称" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="设备编号" prop="deviceCode"
              ><ElInput
                v-model="form.deviceCode"
                :disabled="isRegisteredDevice"
                maxlength="50"
                placeholder="如 DEV-HALL-A-001" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="设备型号" prop="modelId"
              ><ElSelect v-model="form.modelId" class="w-full" placeholder="请选择启用型号"
                ><ElOption
                  v-for="item in enabledModels"
                  :key="item.id"
                  :label="item.modelName"
                  :value="item.id" /></ElSelect></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="设备标签">
              <ElSelect
                v-model="form.tagIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                class="w-full"
                placeholder="请选择设备标签"
                :loading="tagsLoading"
                :disabled="tagsFailed"
              >
                <ElOption
                  v-for="tag in deviceTags"
                  :key="tag.id"
                  :label="tag.name + (tag.status === 'disabled' ? '（已停用）' : '')"
                  :value="tag.id"
                  :disabled="tag.status === 'disabled' && !originalTagIds.includes(tag.id)"
                />
              </ElSelect>
              <ElButton v-if="tagsFailed" link type="primary" @click="refreshTags"
                >标签加载失败，点击重试</ElButton
              >
            </ElFormItem></ElCol
          >
          <ElCol :span="24">
            <ElFormItem label="所属学校" prop="schoolId">
              <ElSelect
                v-model="form.schoolId"
                filterable
                clearable
                class="w-full"
                placeholder="请选择学校（非必填）"
                :loading="schoolsLoading"
                :disabled="schoolsLoading || schoolsFailed"
              >
                <ElOption
                  v-for="school in deviceSchools"
                  :key="school.id"
                  :label="school.name + (school.status === 'disabled' ? '（已停用）' : '')"
                  :value="school.id"
                  :disabled="school.status === 'disabled' && school.id !== originalSchoolId"
                />
              </ElSelect>
              <ElButton v-if="schoolsFailed" link type="primary" @click="refreshSchools"
                >学校加载失败，点击重试</ElButton
              >
            </ElFormItem>
          </ElCol>
          <ElCol :span="12"
            ><ElFormItem label="序列号"
              ><ElInput
                v-model="form.serialNumber"
                :disabled="isRegisteredDevice"
                maxlength="80"
                placeholder="请输入硬件序列号" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="MAC 地址" prop="macAddress"
              ><ElInput
                v-model="form.macAddress"
                :disabled="isRegisteredDevice"
                maxlength="17"
                placeholder="如 A4:C3:F0:12:10:31" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="安装位置"
              ><ElInput
                v-model="form.location"
                maxlength="100"
                placeholder="请输入具体安装位置" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="启用状态"><ElSwitch v-model="enabled" /></ElFormItem
          ></ElCol>
          <ElCol :span="24"
            ><ElFormItem label="备注"
              ><ElInput
                v-model="form.remark"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit /></ElFormItem
          ></ElCol>
        </ElRow>
      </ElForm>
      <template #footer
        ><ElButton :disabled="saving" @click="dialogVisible = false">取消</ElButton
        ><ElButton
          type="primary"
          :loading="saving"
          :disabled="schoolsLoading || schoolsFailed || tagsLoading || tagsFailed"
          @click="handleSubmit"
          >保存</ElButton
        ></template
      >
    </ElDialog>

    <ElDrawer v-model="detailVisible" title="设备详情" size="1000px">
      <template v-if="currentDevice">
        <div class="detail-title">
          <ElAvatar shape="square" :size="64" :src="getModelImage(currentDevice.modelId)" />
          <div
            ><h3>{{ currentDevice.deviceName }}</h3
            ><p>{{ currentDevice.deviceCode }}</p></div
          >
          <ElTag :type="ONLINE_CONFIG[currentDevice.onlineStatus].type">{{
            ONLINE_CONFIG[currentDevice.onlineStatus].label
          }}</ElTag>
        </div>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="所属学校">{{
            currentDevice.schoolName || '未关联学校'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="设备型号">{{
            getModelName(currentDevice.modelId)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="设备标签">{{
            currentDevice.tags?.map((tag) => tag.name).join('、') || '未设置标签'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="安装位置">{{
            currentDevice.location || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="硬件序列号">{{
            currentDevice.serialNumber || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="MAC 地址">{{
            currentDevice.macAddress || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="IP 地址">{{
            currentDevice.ipAddress || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客户端版本">{{
            currentDevice.clientVersion || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="系统版本">{{
            currentDevice.systemVersion || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="电源状态">尚未上报</ElDescriptionsItem>
          <ElDescriptionsItem label="最后心跳">{{
            currentDevice.lastHeartbeatAt
              ? formatDateTime(currentDevice.lastHeartbeatAt)
              : '尚未上报'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="备注">{{ currentDevice.remark || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
        <DeviceSchoolDetails v-if="detailVisible" :device-id="currentDevice.id" />
        <div v-if="currentDevice.id >= 1_000_000_000" class="detail-actions-panel">
          <ElButton type="warning" plain @click="handleResetConnection(currentDevice)">
            <ArtSvgIcon icon="ri:key-2-line" class="mr-1" />重置设备连接
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <Teleport to="body">
      <ArtMenuRight
        ref="deviceMenuRef"
        :menu-items="deviceMenuItems"
        :menu-width="180"
        :border-radius="10"
        @select="handleDeviceMenuSelect"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import DeviceSchoolDetails from './components/device-school-details.vue'
  import ArtMenuRight, {
    type MenuItemType
  } from '@/components/core/others/art-menu-right/index.vue'
  import { Search } from '@element-plus/icons-vue'
  import {
    ElMessage,
    ElMessageBox,
    type FormInstance,
    type FormRules,
    type TagProps
  } from 'element-plus'
  import { schoolError } from '@/views/school/shared/school-data'
  import { formatDateTime } from '@/utils/date'
  import {
    deviceTags,
    loadDeviceTags,
    deviceModels,
    devices,
    getModelImage,
    getModelName,
    removeDevice,
    resetDeviceConnection,
    saveDevice,
    loadDevices,
    loadDevice,
    deviceSchools,
    loadDeviceSchools,
    type Device,
    type DeviceMutation,
    type OnlineStatus
  } from '../shared/device-store'
  import { subscribeDeviceRealtime } from '../shared/device-realtime'

  defineOptions({ name: 'DeviceList' })
  const router = useRouter()
  const openMonitor = (row: Device) => {
    void router.push({
      name: 'DeviceMonitorDetail',
      query: { deviceId: String(row.id), deviceName: row.deviceName, deviceCode: row.deviceCode }
    })
  }
  const devicesLoading = ref(false)
  const devicesFailed = ref(false)
  const schoolsLoading = ref(false)
  const schoolsFailed = ref(false)
  const saving = ref(false)
  const originalTagIds = ref<number[]>([])
  const tagsLoading = ref(false)
  const tagsFailed = ref(false)
  const refreshTags = async () => {
    tagsLoading.value = true
    tagsFailed.value = false
    try {
      await loadDeviceTags()
    } catch (error) {
      tagsFailed.value = true
      ElMessage.error(schoolError(error, '加载标签失败'))
    } finally {
      tagsLoading.value = false
    }
  }
  const originalSchoolId = ref<number | null>()
  const refreshSchools = async () => {
    schoolsLoading.value = true
    schoolsFailed.value = false
    try {
      await loadDeviceSchools()
    } catch (error) {
      schoolsFailed.value = true
      ElMessage.error(schoolError(error, '加载学校失败'))
    } finally {
      schoolsLoading.value = false
    }
  }
  const refreshDevices = async (silent = false) => {
    if (!silent) {
      devicesLoading.value = true
      devicesFailed.value = false
    }
    try {
      await loadDevices()
      if (currentDevice.value)
        currentDevice.value = devices.value.find((d) => d.id === currentDevice.value?.id)
    } catch (error) {
      if (!silent) {
        devicesFailed.value = true
        devices.value = []
        ElMessage.error(schoolError(error, '加载设备失败，请重试'))
      }
    } finally {
      if (!silent) devicesLoading.value = false
    }
  }
  const refreshPage = () => {
    void refreshDevices()
    void refreshSchools()
    void refreshTags()
  }
  let unsubscribeRealtime: (() => void) | undefined
  const realtimeError = ref('')
  const pendingRealtimeIds = new Set<number>()
  let realtimeFlushTimer: ReturnType<typeof setTimeout> | undefined
  const flushRealtimeDevices = async () => {
    const ids = [...pendingRealtimeIds]
    pendingRealtimeIds.clear()
    if (!ids.length) return
    if (ids.length > 4) {
      await refreshDevices(true)
      return
    }
    const results = await Promise.allSettled(ids.map((id) => loadDevice(id)))
    if (results.some((result) => result.status === 'rejected')) await refreshDevices(true)
  }
  const queueRealtimeDevice = (id: number) => {
    pendingRealtimeIds.add(id)
    clearTimeout(realtimeFlushTimer)
    realtimeFlushTimer = setTimeout(() => void flushRealtimeDevices(), 150)
  }
  const stopDeviceRealtime = () => {
    clearTimeout(realtimeFlushTimer)
    pendingRealtimeIds.clear()
    unsubscribeRealtime?.()
    unsubscribeRealtime = undefined
  }
  const startDeviceRealtime = () => {
    if (unsubscribeRealtime) return
    unsubscribeRealtime = subscribeDeviceRealtime((event) => {
      if (event.type === 'realtime.ready') {
        realtimeError.value = ''
        void refreshDevices(true)
      } else if (event.type === 'realtime.disconnected')
        realtimeError.value = '实时连接已断开，正在自动重连；当前保留最后一次设备状态'
      else queueRealtimeDevice(event.deviceId)
    })
  }
  onMounted(() => {
    refreshPage()
    startDeviceRealtime()
  })
  let activatedOnce = false
  onActivated(() => {
    if (activatedOnce) void refreshDevices()
    startDeviceRealtime()
    activatedOnce = true
  })
  onDeactivated(stopDeviceRealtime)
  onBeforeUnmount(stopDeviceRealtime)
  type DeviceForm = Omit<DeviceMutation, 'modelId'> & { modelId?: number }

  const ONLINE_CONFIG: Record<OnlineStatus, { label: string; type: TagProps['type'] }> = {
    online: { label: '在线', type: 'success' },
    offline: { label: '离线', type: 'danger' },
    unknown: { label: '未激活', type: 'info' }
  }
  const searchForm = reactive<{
    keyword: string
    schoolId?: number
    modelId?: number
    tagId?: number
    onlineStatus: '' | OnlineStatus
  }>({ keyword: '', schoolId: undefined, modelId: undefined, tagId: undefined, onlineStatus: '' })
  const appliedSearch = reactive({ ...searchForm })
  const pagination = reactive({ current: 1, size: 12 })
  const dialogVisible = ref(false)
  const detailVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const editingId = ref<number>()
  const isRegisteredDevice = computed(() => (editingId.value ?? 0) >= 1_000_000_000)
  const currentDevice = ref<Device>()
  const formRef = ref<FormInstance>()
  const createEmptyForm = (): DeviceForm => ({
    deviceCode: '',
    deviceName: '',
    serialNumber: '',
    modelId: undefined,
    tagIds: [],
    schoolId: undefined,
    location: '',
    status: 'enabled',
    ipAddress: '',
    macAddress: '',
    clientVersion: '',
    systemVersion: '',
    remark: ''
  })
  const form = reactive<DeviceForm>(createEmptyForm())
  const enabled = computed({
    get: () => form.status === 'enabled',
    set: (value: boolean) => (form.status = value ? 'enabled' : 'disabled')
  })
  const enabledModels = computed(() =>
    deviceModels.value.filter((item) => item.status === 'enabled' || item.id === form.modelId)
  )
  const filteredDevices = computed(() => {
    const keyword = appliedSearch.keyword.trim().toLowerCase()
    return devices.value.filter(
      (item) =>
        (!keyword ||
          `${item.deviceName} ${item.deviceCode} ${item.serialNumber}`
            .toLowerCase()
            .includes(keyword)) &&
        (appliedSearch.schoolId === undefined ||
          (appliedSearch.schoolId === 0
            ? !item.schoolId
            : item.schoolId === appliedSearch.schoolId)) &&
        (!appliedSearch.modelId || item.modelId === appliedSearch.modelId) &&
        (!appliedSearch.tagId || item.tagIds?.includes(appliedSearch.tagId)) &&
        (!appliedSearch.onlineStatus || item.onlineStatus === appliedSearch.onlineStatus)
    )
  })
  const pagedDevices = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredDevices.value.slice(start, start + pagination.size)
  })
  watch(
    [filteredDevices, () => pagination.size],
    ([rows]) => {
      const maxPage = Math.max(1, Math.ceil((rows as Device[]).length / pagination.size))
      if (pagination.current > maxPage) pagination.current = maxPage
    },
    { immediate: true }
  )
  const overviewItems = computed(() => [
    { label: '设备总数', value: devices.value.length, icon: 'ri:device-line', className: 'blue' },
    {
      label: '在线设备',
      value: devices.value.filter((item) => item.onlineStatus === 'online').length,
      icon: 'ri:wifi-line',
      className: 'green'
    },
    {
      label: '离线设备',
      value: devices.value.filter((item) => item.onlineStatus === 'offline').length,
      icon: 'ri:wifi-off-line',
      className: 'red'
    },
    {
      label: '未激活',
      value: devices.value.filter((item) => item.onlineStatus === 'unknown').length,
      icon: 'ri:question-line',
      className: 'gray'
    }
  ])
  const rules: FormRules = {
    deviceName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
    deviceCode: [
      { required: true, message: '请输入设备编号', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线和短横线', trigger: 'blur' }
    ],
    modelId: [
      {
        validator: (_rule, value, callback) => {
          if (!isRegisteredDevice.value && !value) callback(new Error('请选择设备型号'))
          else callback()
        },
        trigger: 'change'
      }
    ],
    macAddress: [
      {
        pattern: /^$|^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
        message: '请输入正确的 MAC 地址',
        trigger: 'blur'
      }
    ]
  }

  const handleSearch = () => {
    Object.assign(appliedSearch, searchForm)
    pagination.current = 1
  }
  const handleReset = () => {
    Object.assign(searchForm, {
      keyword: '',
      schoolId: undefined,
      modelId: undefined,
      tagId: undefined,
      onlineStatus: ''
    })
    handleSearch()
  }

  const openDialog = (type: 'add' | 'edit', row?: Device) => {
    void refreshSchools()
    originalSchoolId.value = row?.schoolId
    originalTagIds.value = [...(row?.tagIds ?? [])]
    void refreshTags()
    dialogType.value = type
    editingId.value = row?.id
    Object.assign(
      form,
      row
        ? {
            deviceCode: row.deviceCode,
            deviceName: row.deviceName,
            serialNumber: row.serialNumber,
            modelId: row.modelId || undefined,
            tagIds: [...(row.tagIds ?? [])],
            schoolId: row.schoolId,
            location: row.location,
            status: row.status,
            ipAddress: row.ipAddress,
            macAddress: row.macAddress,
            clientVersion: row.clientVersion,
            systemVersion: row.systemVersion,
            remark: row.remark
          }
        : createEmptyForm()
    )
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
  const handleSubmit = async () => {
    if (
      saving.value ||
      tagsLoading.value ||
      tagsFailed.value ||
      schoolsLoading.value ||
      schoolsFailed.value ||
      !formRef.value ||
      !(await formRef.value.validate().catch(() => false)) ||
      (!isRegisteredDevice.value && !form.modelId)
    )
      return
    const duplicateCode = devices.value.some(
      (item) =>
        item.deviceCode.toLowerCase() === form.deviceCode.trim().toLowerCase() &&
        item.id !== editingId.value
    )
    if (duplicateCode) return void ElMessage.warning('设备编号已存在')
    const duplicateSerial =
      form.serialNumber &&
      devices.value.some(
        (item) => item.serialNumber === form.serialNumber.trim() && item.id !== editingId.value
      )
    if (duplicateSerial) return void ElMessage.warning('设备序列号已存在')
    saving.value = true
    try {
      const payload = isRegisteredDevice.value
        ? {
            deviceName: form.deviceName.trim(),
            modelId: form.modelId,
            tagIds: form.tagIds,
            schoolId: form.schoolId,
            location: form.location,
            status: form.status,
            remark: form.remark
          }
        : {
            ...form,
            modelId: form.modelId,
            deviceCode: form.deviceCode.trim(),
            deviceName: form.deviceName.trim()
          }
      await saveDevice(payload, editingId.value)
      dialogVisible.value = false
      ElMessage.success(dialogType.value === 'add' ? '设备新增成功' : '设备修改成功')
      await refreshDevices()
    } catch (error) {
      ElMessage.error(schoolError(error))
    } finally {
      saving.value = false
    }
  }
  const deviceMenuRef = ref<InstanceType<typeof ArtMenuRight>>()
  const contextDeviceId = ref<number>()
  const deviceMenuItems = computed<MenuItemType[]>(() => [
    { key: 'detail', label: '查看详情', icon: 'ri:eye-line' },
    { key: 'monitor', label: '设备监控', icon: 'ri:dashboard-3-line' },
    { key: 'edit', label: '编辑设备', icon: 'ri:edit-2-line', showLine: true },
    {
      key: 'reset-connection',
      label: '重置设备连接',
      icon: 'ri:key-2-line',
      disabled: contextDeviceId.value === undefined || contextDeviceId.value < 1_000_000_000
    },
    {
      key: 'delete',
      label: '删除设备',
      icon: 'ri:delete-bin-4-line',
      disabled: contextDeviceId.value === undefined
    }
  ])
  const showDeviceMenu = async (event: MouseEvent, row: Device) => {
    contextDeviceId.value = row.id
    await nextTick()
    deviceMenuRef.value?.show(event)
  }
  const hideDeviceMenu = () => deviceMenuRef.value?.hide()
  const handleDeviceMenuSelect = (item: MenuItemType) => {
    if (item.disabled) return
    const row = devices.value.find((device) => device.id === contextDeviceId.value)
    if (row) handleCommand(item.key, row)
  }
  watch(pagedDevices, hideDeviceMenu)
  onDeactivated(hideDeviceMenu)
  onBeforeUnmount(hideDeviceMenu)

  const handleCommand = (command: string, row: Device) => {
    hideDeviceMenu()
    if (command === 'monitor') openMonitor(row)
    if (command === 'detail') {
      currentDevice.value = row
      detailVisible.value = true
    }
    if (command === 'reset-connection') void handleResetConnection(row)
    if (command === 'edit') openDialog('edit', row)
    if (command === 'delete') handleDelete(row)
  }
  const handleResetConnection = async (row: Device) => {
    if (row.id < 1_000_000_000) return
    try {
      await ElMessageBox.confirm(
        `重置“${row.deviceName}”的连接后，客户端会在下一次遥测重试时自动恢复。是否继续？`,
        '重置设备连接',
        { type: 'warning', confirmButtonText: '确认重置' }
      )
      await resetDeviceConnection(row.id)
      ElMessage.success('设备连接已重置，等待客户端自动恢复')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close')
        ElMessage.error(schoolError(error, '重置设备连接失败'))
    }
  }
  const handleDelete = async (row: Device) => {
    try {
      const registeredHint =
        row.id >= 1_000_000_000
          ? '删除后将同时清除连接凭据、遥测历史和 OTA 任务记录；如需再次使用，必须重新激活。'
          : '删除后将同时清除标签关联和 OTA 任务记录。'
      await ElMessageBox.confirm(
        `确定删除设备“${row.deviceName}”吗？${registeredHint}`,
        '删除设备',
        { type: 'warning', confirmButtonText: '确认删除' }
      )
      await removeDevice(row.id)
      ElMessage.success('设备删除成功')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error(schoolError(error))
    }
  }
</script>

<style scoped lang="scss">
  .device-list-page {
    box-sizing: border-box;
    min-height: 0;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 14px;
  }

  .realtime-alert {
    margin-bottom: 14px;
  }

  .overview-card {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 18px 20px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  .overview-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 10px;
  }

  .overview-icon.blue {
    color: #4f7cff;
    background: #eef3ff;
  }

  .overview-icon.green {
    color: #29a36a;
    background: #eaf8f1;
  }

  .overview-icon.red {
    color: #e45858;
    background: #fff0f0;
  }

  .overview-icon.gray {
    color: #7c8798;
    background: #f1f3f6;
  }

  .overview-value {
    font-size: 24px;
    font-weight: 600;
    line-height: 1;
    color: var(--el-text-color-primary);
  }

  .overview-label {
    margin-top: 7px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .filter-card {
    margin-bottom: 16px;
  }

  .filter-row,
  .filter-fields,
  .filter-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .filter-row {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .filter-fields {
    flex: 1;
    flex-wrap: wrap;
  }

  .filter-fields > :first-child {
    width: min(320px, 30vw);
  }

  .filter-fields :deep(.el-select),
  .filter-fields :deep(.el-tree-select) {
    width: 180px;
  }

  .device-grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 14px;
    align-content: start;
  }

  .device-card {
    min-width: 0;
    padding: 14px 14px 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .device-card:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 10px 28px rgb(31 44 68 / 9%);
    transform: translateY(-2px);
  }

  .device-main {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    min-width: 0;
  }

  .device-cover {
    position: relative;
    flex: none;
    width: 112px;
    height: 112px;
    overflow: hidden;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 9px;
  }

  .device-cover :deep(.el-image) {
    width: 100%;
    height: 100%;
    border-radius: 9px;
  }

  .device-cover :deep(img) {
    padding: 3px;
    border-radius: 9px;
    transition: transform 0.25s ease;
  }

  .device-card:hover .device-cover :deep(img) {
    transform: scale(1.025);
  }

  .image-placeholder {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    font-size: 36px;
    color: var(--el-text-color-placeholder);
  }

  .disabled-mask {
    position: absolute;
    right: 6px;
    bottom: 6px;
    padding: 2px 6px;
    font-size: 11px;
    color: #fff;
    background: rgb(0 0 0 / 58%);
    border-radius: 4px;
  }

  .device-content {
    flex: 1;
    min-width: 0;
    padding-top: 1px;
  }

  .device-heading {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
    min-width: 0;
  }

  .device-heading h3 {
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .device-heading p {
    margin-top: 2px;
    overflow: hidden;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 18px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more-button {
    display: grid;
    flex: none;
    place-items: center;
    width: 28px;
    height: 28px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    border-radius: 6px;
  }

  .more-button:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
  }

  .device-meta {
    display: grid;
    gap: 6px;
    margin-top: 10px;
  }

  .device-meta > div {
    display: flex;
    gap: 7px;
    align-items: center;
    min-width: 0;
    font-size: 13px;
    line-height: 18px;
    color: var(--el-text-color-regular);
  }

  .device-meta svg {
    flex: none;
    color: var(--el-text-color-secondary);
  }

  .device-meta span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .device-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    padding-top: 11px;
    margin-top: 13px;
    border-top: 1px solid var(--el-border-color-extra-light);
  }

  .device-status-group,
  .device-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .device-status-group {
    flex-wrap: wrap;
    min-width: 0;
  }

  .device-actions {
    flex: none;
  }

  .status-text {
    font-size: 13px;
    line-height: 24px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .status-text.is-online {
    color: var(--el-color-success);
  }

  .status-text.is-offline {
    color: var(--el-color-danger);
  }

  .status-text.is-unknown,
  .status-text.is-disabled {
    color: var(--el-text-color-secondary);
  }

  .pagination-wrap {
    display: flex;
    flex: none;
    justify-content: center;
    padding-top: 22px;
  }

  .empty-card {
    display: grid;
    flex: 1;
    place-items: center;
    min-height: 360px;
  }

  .detail-title {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 22px;
  }

  .detail-title > div {
    flex: 1;
    min-width: 0;
  }

  .detail-title h3 {
    font-size: 17px;
    font-weight: 600;
  }

  .detail-title p {
    margin-top: 5px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .detail-actions-panel {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-extra-light);
  }

  .text-danger {
    display: flex;
    align-items: center;
    color: var(--el-color-danger);
  }

  @media (width <= 1100px) {
    .overview-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-fields {
      flex-wrap: wrap;
      width: 100%;
    }
  }

  @media (width <= 640px) {
    .overview-grid,
    .device-grid {
      grid-template-columns: 1fr;
    }

    .device-grid {
      gap: 12px;
    }

    .filter-fields > :first-child,
    .filter-fields :deep(.el-select),
    .filter-fields :deep(.el-tree-select) {
      width: 100%;
    }

    .filter-actions {
      flex-wrap: wrap;
      width: 100%;
    }

    .device-card {
      padding: 12px;
    }

    .device-main {
      gap: 12px;
    }

    .device-cover {
      width: 92px;
      height: 92px;
    }

    .device-meta {
      margin-top: 7px;
    }

    .device-meta > div:nth-child(2) {
      display: none;
    }

    .device-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .device-actions {
      justify-content: flex-end;
      width: 100%;
    }
  }
</style>
