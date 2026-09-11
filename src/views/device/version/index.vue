<template>
  <div class="version-page page-content art-full-height">
    <header class="page-heading">
      <div>
        <div class="title-line">
          <h1>版本与更新</h1>
        </div>
        <p>集中管理 Client 安装包，按关联学校执行灰度发布并跟踪升级进度。</p>
      </div>
      <ElButton type="primary" @click="openCreateDialog">
        <ArtSvgIcon icon="ri:upload-cloud-2-line" />
        上传新版本
      </ElButton>
    </header>

    <ElRow :gutter="16" class="stats-row">
      <ElCol v-for="card in statsCards" :key="card.label" :xs="24" :sm="12" :xl="6">
        <ArtStatsCard
          :title="card.value"
          :description="card.label"
          :icon="card.icon"
          :icon-style="card.iconStyle"
          :show-arrow="false"
        />
      </ElCol>
    </ElRow>

    <ElCard class="version-card art-table-card" shadow="never">
      <div id="art-table-header" class="table-header">
        <ElTabs v-model="activeStatusTab" class="status-tabs" @tab-change="handleStatusTabChange">
          <ElTabPane
            v-for="tab in statusTabs"
            :key="tab.value"
            :name="tab.value"
            :label="`${tab.label} (${tab.count})`"
          />
        </ElTabs>

        <div class="toolbar">
          <div class="filters">
            <ElInput
              v-model="searchForm.keyword"
              clearable
              placeholder="搜索版本号、文件名或更新说明"
              class="keyword-input"
              @keyup.enter="applySearch"
            >
              <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
            </ElInput>
            <ElButton type="primary" @click="applySearch">查询</ElButton>
            <ElButton @click="resetSearch">重置</ElButton>
          </div>
          <ElButton @click="refreshData()"><ArtSvgIcon icon="ri:refresh-line" />刷新</ElButton>
        </div>
      </div>

      <ArtTable
        :loading="loading"
        :data="pagedRecords"
        :columns="columns"
        :pagination="pagination"
        :stripe="false"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="createDialogVisible"
      :title="editingRecord ? '编辑未发布版本' : '上传软件版本'"
      width="680px"
      align-center
      :close-on-click-modal="false"
      @closed="resetCreateForm"
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="96px">
        <ElFormItem label="版本号" prop="version">
          <ElInput v-model="form.version" placeholder="如 0.0.1" maxlength="40" />
        </ElFormItem>
        <ElFormItem label="版本文件" prop="fileName">
          <div class="package-editor">
            <div v-if="editingRecord" class="current-package">
              <ArtSvgIcon icon="ri:file-download-line" class="current-package-icon" />
              <div class="current-package-info">
                <span>当前安装包</span>
                <strong :title="editingRecord.fileName">{{ editingRecord.fileName }}</strong>
                <small>{{ formatFileSize(editingRecord.fileSize) }}</small>
              </div>
              <ElTag type="info" effect="plain">已上传</ElTag>
            </div>
            <ElUpload
              v-model:file-list="uploadFiles"
              drag
              :auto-upload="false"
              :limit="1"
              accept=".exe"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              class="version-uploader"
            >
              <ArtSvgIcon icon="ri:upload-cloud-2-line" class="upload-icon" />
              <div class="el-upload__text">
                {{ editingRecord ? '拖放新安装包到这里，或' : '拖放文件到这里，或' }}
                <em>点击选择</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  {{
                    editingRecord
                      ? '选择新文件后，保存修改将替换当前安装包；不选择则保留原安装包'
                      : '支持 Windows NSIS .exe，最大 500 MB'
                  }}
                </div>
              </template>
            </ElUpload>
          </div>
        </ElFormItem>
        <ElFormItem label="更新说明" prop="releaseNotes">
          <ElInput
            v-model="form.releaseNotes"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="说明本次新增功能、修复问题及升级注意事项"
          />
        </ElFormItem>
      </ElForm>
      <ElAlert
        title="保存后生成草稿，不会立即下发；云服务会计算 SHA-512，正式环境还应校验安装包数字签名。"
        type="info"
        :closable="false"
        show-icon
      />
      <template #footer>
        <ElButton @click="createDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingDraft" @click="submitDraft">
          {{ editingRecord ? '保存修改' : '保存草稿' }}
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="publishDialogVisible"
      :title="`发布版本 ${currentRecord?.version ?? ''}`"
      width="680px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm :model="publishForm" label-width="106px">
        <ElFormItem label="关联学校" required>
          <ElSelect
            v-model="publishForm.schoolIds"
            @change="handleSchoolSelection"
            multiple
            collapse-tags
            collapse-tags-tooltip
            class="w-full"
            placeholder="请选择关联学校"
            :loading="targetsLoading"
            :disabled="targetsLoading || targetsFailed"
          >
            <ElOption label="全部" :value="0" />
            <ElOption
              v-for="school in publishSchools"
              :key="school.id"
              :label="`${school.name}（${schoolDeviceCount(school.id)} 台）`"
              :value="school.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElButton v-if="targetsFailed" link type="primary" @click="loadPublishTargets"
          >学校及设备加载失败，点击重试</ElButton
        >
        <ElFormItem label="灰度比例">
          <div class="rollout-field">
            <ElSlider v-model="publishForm.rolloutPercentage" :step="10" :min="10" show-stops />
            <span>{{ publishForm.rolloutPercentage }}%</span>
          </div>
        </ElFormItem>
        <ElFormItem label="执行方式">
          <ElRadioGroup v-model="publishForm.scheduleMode">
            <ElRadio value="immediate">立即下发</ElRadio>
            <ElRadio value="scheduled">定时下发</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="publishForm.scheduleMode === 'scheduled'" label="执行时间" required>
          <ElDatePicker
            v-model="publishForm.scheduledAt"
            type="datetime"
            placeholder="选择下发时间"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="强制更新">
          <ElSwitch v-model="publishForm.mandatory" />
          <span class="field-help">客户端下载完成后弹出确认框，确认后重启安装</span>
        </ElFormItem>
      </ElForm>
      <ElAlert
        :title="
          estimatedDeviceCount
            ? `预计覆盖 ${estimatedDeviceCount} 台设备；离线设备将在恢复连接后接收任务。`
            : '当前没有可更新设备，本次将仅发布版本；有设备注册后可再新建更新任务。'
        "
        type="info"
        :closable="false"
        show-icon
      />
      <template #footer>
        <ElButton @click="publishDialogVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="publishing"
          :disabled="targetsLoading || targetsFailed"
          @click="submitPublish"
          >确认发布</ElButton
        >
      </template>
    </ElDialog>

    <ElDrawer v-model="detailVisible" title="版本详情" size="min(560px, 100vw)">
      <template v-if="currentRecord">
        <div class="detail-version">
          <div class="package-icon">
            <ArtSvgIcon icon="ri:windows-line" />
          </div>
          <div>
            <h2>{{ currentRecord.version }}</h2>
            <p>{{ currentRecord.fileName }}</p>
          </div>
          <ElTag :type="statusConfig[currentRecord.status].type">
            {{ statusConfig[currentRecord.status].label }}
          </ElTag>
        </div>

        <ElDescriptions :column="1" border class="detail-descriptions">
          <ElDescriptionsItem label="文件大小">{{
            formatFileSize(currentRecord.fileSize)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="文件校验">{{ currentRecord.checksum }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建人">{{ currentRecord.createdBy }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{
            formatDateTime(currentRecord.createdAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="发布时间">{{
            currentRecord.publishedAt ? formatDateTime(currentRecord.publishedAt) : '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="关联学校">{{
            currentDetailTask?.targetGroups.join('、') || '尚未设置'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新策略">{{
            currentDetailTask
              ? `${currentDetailTask.rolloutPercentage}% 灰度${currentDetailTask.mandatory ? ' · 强制更新' : ''}`
              : '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="currentDetailTask?.scheduledAt" label="计划执行">{{
            currentDetailTask.scheduledAt
          }}</ElDescriptionsItem>
        </ElDescriptions>

        <section class="detail-section">
          <h3>更新说明</h3>
          <p>{{ currentRecord.releaseNotes }}</p>
          <ElButton
            tag="a"
            type="primary"
            :href="getVersionDownloadUrl(currentRecord.id)"
            target="_blank"
            rel="noopener"
            >下载此版本</ElButton
          >
        </section>

        <section v-if="currentDetailTask?.deviceResults.length" class="detail-section">
          <div class="section-heading">
            <h3>设备更新进度</h3>
            <strong>{{ formatUpgradeProgress(currentDetailTask) }}</strong>
          </div>
          <div class="progress-summary">
            <span
              ><i class="dot success"></i>已完成 {{ taskInstalledCount(currentDetailTask) }}</span
            >
            <span><i class="dot waiting"></i>待更新 {{ taskPendingCount(currentDetailTask) }}</span>
            <span><i class="dot failed"></i>失败 {{ taskFailedCount(currentDetailTask) }}</span>
          </div>
          <ElTable :data="currentDetailTask.deviceResults" size="small" class="device-result-table">
            <ElTableColumn label="设备" min-width="180">
              <template #default="{ row }">
                <div>{{ getDevice(row.deviceId)?.deviceName || `设备 ${row.deviceId}` }}</div>
                <small>{{ getDevice(row.deviceId)?.deviceCode || '-' }}</small>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag
                  :type="deviceStatusConfig[row.status as DeviceUpdateStatus].type"
                  size="small"
                >
                  {{ deviceStatusConfig[row.status as DeviceUpdateStatus].label }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="errorMessage" label="结果说明" min-width="150">
              <template #default="{ row }">{{ row.errorMessage || '-' }}</template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <ElButton
                  v-if="
                    row.status === 'failed' &&
                    currentRecord.status !== 'archived' &&
                    ['releasing', 'partial_failed'].includes(currentDetailTask.status)
                  "
                  link
                  type="primary"
                  @click="handleRetryDevice(row.deviceId)"
                >
                  重试
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </section>

        <section v-if="currentVersionTasks.length" class="detail-section">
          <h3>发布任务记录</h3>
          <div v-for="task in currentVersionTasks" :key="task.id" class="task-history-item">
            <div>
              <strong>#{{ task.id }} · {{ task.targetGroups.join('、') }}</strong>
              <p>{{ formatDateTime(task.createdAt) }} · {{ task.rolloutPercentage }}% 灰度</p>
            </div>
            <ElTag :type="taskStatusConfig[task.status].type" size="small">
              {{ taskStatusConfig[task.status].label }}
            </ElTag>
          </div>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import axios from 'axios'
  import { compareVersions } from './version-utils'
  import {
    ElButton,
    ElMessage,
    ElMessageBox,
    ElTag,
    type FormInstance,
    type FormRules,
    type TagProps,
    type UploadFile,
    type UploadUserFile
  } from 'element-plus'
  import { apiServerRequest } from '@/api/auth'
  import { formatDateTime } from '@/utils/date'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { type Device } from '../shared/device-store'
  import {
    addVersionDraft,
    archiveVersion,
    cancelReleaseTask,
    createReleaseTask,
    deleteVersionDraft,
    getLatestTask,
    getVersionDownloadUrl,
    getVersionTasks,
    loadVersionDetail,
    loadVersions,
    pauseReleaseTask,
    releaseTasks,
    resumeReleaseTask,
    retryDeviceUpdate,
    updateVersionDraft,
    versionRecords,
    type DeviceUpdateStatus,
    type ReleaseTask,
    type ReleaseTaskStatus,
    type VersionRecord,
    type VersionStatus
  } from './version-store'

  defineOptions({ name: 'DeviceVersion' })

  const statusConfig: Record<VersionStatus, { label: string; type: TagProps['type'] }> = {
    draft: { label: '草稿', type: 'info' },
    scheduled: { label: '待发布', type: 'warning' },
    releasing: { label: '发布中', type: 'warning' },
    paused: { label: '已暂停', type: 'warning' },
    published: { label: '已发布', type: 'success' },
    partial_failed: { label: '部分失败', type: 'danger' },
    archived: { label: '已归档', type: 'info' }
  }
  const taskStatusConfig: Record<ReleaseTaskStatus, { label: string; type: TagProps['type'] }> = {
    scheduled: { label: '待执行', type: 'warning' },
    releasing: { label: '执行中', type: 'warning' },
    paused: { label: '已暂停', type: 'warning' },
    completed: { label: '已完成', type: 'success' },
    partial_failed: { label: '部分失败', type: 'danger' },
    cancelled: { label: '已取消', type: 'info' }
  }
  const deviceStatusConfig: Record<DeviceUpdateStatus, { label: string; type: TagProps['type'] }> =
    {
      pending: { label: '等待更新', type: 'info' },
      downloading: { label: '下载中', type: 'warning' },
      installed: { label: '已完成', type: 'success' },
      failed: { label: '失败', type: 'danger' }
    }
  type StatusTab = 'unpublished' | 'published' | 'archived'

  const activeStatusTab = ref<StatusTab>('published')
  const searchForm = reactive({ keyword: '' })
  const appliedSearch = reactive({ keyword: '' })
  const pagination = reactive({ current: 1, size: 10, total: 0 })
  const loading = ref(false)
  const savingDraft = ref(false)
  const publishing = ref(false)
  const createDialogVisible = ref(false)
  const editingRecord = ref<VersionRecord>()
  const publishDialogVisible = ref(false)
  const detailVisible = ref(false)
  const currentRecord = ref<VersionRecord>()
  const currentDetailTask = computed(() =>
    currentRecord.value ? getLatestTask(currentRecord.value.id) : undefined
  )
  const currentVersionTasks = computed(() =>
    currentRecord.value ? getVersionTasks(currentRecord.value.id) : []
  )
  const formRef = ref<FormInstance>()
  const uploadFiles = ref<UploadUserFile[]>([])
  const createEmptyForm = () => ({
    version: '',
    fileName: '',
    fileSize: 0,
    releaseNotes: ''
  })
  const form = reactive(createEmptyForm())
  const publishForm = reactive({
    schoolIds: [0] as number[],
    rolloutPercentage: 100,
    scheduleMode: 'immediate' as 'immediate' | 'scheduled',
    scheduledAt: undefined as Date | undefined,
    mandatory: false
  })
  const formRules: FormRules = {
    version: [
      { required: true, message: '请输入版本号', trigger: 'blur' },
      {
        pattern:
          /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
        message: '请输入软件版本号，例如 1.2.3 或 1.2.3-beta.1',
        trigger: 'blur'
      }
    ],
    fileName: [{ required: true, message: '请选择版本文件', trigger: 'change' }],
    releaseNotes: [{ required: true, message: '请填写更新说明', trigger: 'blur' }]
  }

  const publishSchools = ref<Array<{ id: number; name: string }>>([])
  const publishTargets = ref<Device[]>([])
  const targetsLoading = ref(false)
  const targetsFailed = ref(false)
  let previousSchoolIds = [0]
  const handleSchoolSelection = (ids: number[]) => {
    if (ids.includes(0) && ids.length > 1)
      publishForm.schoolIds = previousSchoolIds.includes(0) ? ids.filter((id) => id !== 0) : [0]
    previousSchoolIds = [...publishForm.schoolIds]
  }
  const loadPublishTargets = async () => {
    targetsLoading.value = true
    targetsFailed.value = false
    try {
      const { data } = await apiServerRequest.get<{
        schools: typeof publishSchools.value
        devices: Device[]
      }>('/ota/release-targets', { timeout: 15000 })
      publishSchools.value = data.schools
      publishTargets.value = data.devices
    } catch (error) {
      targetsFailed.value = true
      publishTargets.value = []
      showRequestError(error)
    } finally {
      targetsLoading.value = false
    }
  }
  const schoolDeviceCount = (id: number) =>
    publishTargets.value.filter((d) => d.schoolId === id).length
  const selectedTargetDevices = computed(() => {
    const candidates = publishTargets.value
      .filter(
        (d) => publishForm.schoolIds.includes(0) || publishForm.schoolIds.includes(d.schoolId ?? -1)
      )
      .sort((a, b) => a.id - b.id)
    return candidates.slice(0, Math.ceil((candidates.length * publishForm.rolloutPercentage) / 100))
  })
  const latestSoftware = computed(
    () =>
      versionRecords.value
        .filter((item) => item.publishedAt && item.status !== 'archived')
        .sort((a, b) => compareVersions(b.version, a.version))[0]
  )
  const pendingDevices = computed(() =>
    releaseTasks.value
      .filter((task) => ['scheduled', 'releasing', 'paused'].includes(task.status))
      .reduce((total, task) => total + taskPendingCount(task), 0)
  )
  const completedTotal = computed(() =>
    releaseTasks.value.reduce((total, task) => total + taskInstalledCount(task), 0)
  )
  const deploymentTotal = computed(() =>
    releaseTasks.value
      .filter((task) => task.status !== 'cancelled')
      .reduce((total, task) => total + task.deviceResults.length, 0)
  )
  const successRate = computed(() =>
    deploymentTotal.value ? Math.round((completedTotal.value / deploymentTotal.value) * 100) : 100
  )
  const statsCards = computed(() => [
    {
      label: '最新软件版本',
      value: `v${latestSoftware.value?.version ?? '-'}`,
      icon: 'ri:windows-line',
      iconStyle: 'bg-theme'
    },
    {
      label: '纳管设备',
      value: `${publishTargets.value.length} 台`,
      icon: 'ri:computer-line',
      iconStyle: 'bg-secondary'
    },
    {
      label: '待更新设备',
      value: `${pendingDevices.value} 台`,
      icon: 'ri:download-cloud-2-line',
      iconStyle: 'bg-warning'
    },
    {
      label: '累计更新成功率',
      value: `${successRate.value}%`,
      icon: 'ri:checkbox-circle-line',
      iconStyle: 'bg-success'
    }
  ])

  const statusTabs = computed(() => [
    {
      label: '未发布',
      value: 'unpublished' as const,
      count: versionRecords.value.filter((item) => ['draft', 'scheduled'].includes(item.status))
        .length
    },
    {
      label: '已发布',
      value: 'published' as const,
      count: versionRecords.value.filter((item) =>
        ['releasing', 'paused', 'published', 'partial_failed'].includes(item.status)
      ).length
    },
    {
      label: '归档',
      value: 'archived' as const,
      count: versionRecords.value.filter((item) => item.status === 'archived').length
    }
  ])

  const filteredRecords = computed(() => {
    const keyword = appliedSearch.keyword.trim().toLowerCase()
    return versionRecords.value.filter((item) => {
      const matchesStatus =
        activeStatusTab.value === 'unpublished'
          ? item.status === 'draft' || item.status === 'scheduled'
          : activeStatusTab.value === 'published'
            ? ['releasing', 'paused', 'published', 'partial_failed'].includes(item.status)
            : item.status === 'archived'
      const matchesKeyword =
        !keyword ||
        `${item.version} ${item.fileName} ${item.releaseNotes}`.toLowerCase().includes(keyword)
      return matchesStatus && matchesKeyword
    })
  })
  const pagedRecords = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRecords.value.slice(start, start + pagination.size)
  })
  watch(
    filteredRecords,
    (rows) => {
      pagination.total = rows.length
      const maxPage = Math.max(1, Math.ceil(rows.length / pagination.size))
      if (pagination.current > maxPage) pagination.current = maxPage
    },
    { immediate: true }
  )
  const { columns } = useTableColumns<VersionRecord>(() => [
    { type: 'globalIndex', label: '序号', width: 70, fixed: 'left' },
    {
      prop: 'version',
      label: '版本号',
      minWidth: 150,
      fixed: 'left',
      formatter: (row) =>
        h('div', { class: 'version-cell' }, [
          h('strong', {}, `v${row.version}`),
          row.id === latestSoftware.value?.id
            ? h(ElTag, { size: 'small', type: 'success', effect: 'plain' }, () => '当前')
            : null
        ])
    },
    {
      prop: 'fileName',
      label: '版本文件',
      minWidth: 270,
      showOverflowTooltip: true,
      formatter: (row) =>
        h('div', { class: 'file-cell' }, [
          h('span', {}, row.fileName),
          h('small', {}, formatFileSize(row.fileSize))
        ])
    },
    {
      prop: 'releaseNotes',
      label: '更新说明',
      minWidth: 260,
      showOverflowTooltip: true
    },
    {
      prop: 'status',
      label: '发布状态',
      width: 100,
      formatter: (row) =>
        h(ElTag, { type: statusConfig[row.status].type }, () => statusConfig[row.status].label)
    },
    {
      prop: 'progress',
      label: '升级进度',
      minWidth: 190,
      formatter: (row) => {
        const task = getLatestTask(row.id)
        return task?.deviceResults.length
          ? h('span', { class: 'upgrade-progress-text' }, formatUpgradeProgress(task))
          : h('span', { class: 'text-g-400' }, '尚未发布')
      }
    },
    { prop: 'createdBy', label: '创建人', width: 110 },
    {
      prop: 'createdAt',
      label: '创建时间',
      width: 180,
      sortable: true,
      formatter: (row) => formatDateTime(row.createdAt)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 300,
      fixed: 'right',
      disabled: true,
      formatter: (row) =>
        h('div', { class: 'table-actions' }, [
          h(
            ElButton,
            {
              tag: 'a',
              link: true,
              type: 'primary',
              href: getVersionDownloadUrl(row.id),
              target: '_blank',
              rel: 'noopener'
            },
            () => '下载'
          ),
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openDetail(row) },
            () => '详情'
          ),
          ['draft', 'published', 'partial_failed'].includes(row.status)
            ? h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openPublishDialog(row) },
                () => (row.status === 'draft' ? '发布' : '新建任务')
              )
            : null,
          row.status === 'releasing'
            ? h(
                ElButton,
                { link: true, type: 'warning', onClick: () => handlePause(row) },
                () => '暂停'
              )
            : null,
          row.status === 'paused'
            ? h(
                ElButton,
                { link: true, type: 'primary', onClick: () => handleResume(row) },
                () => '继续'
              )
            : null,
          ['scheduled', 'paused'].includes(row.status)
            ? h(
                ElButton,
                { link: true, type: 'danger', onClick: () => handleCancelTask(row) },
                () => '取消任务'
              )
            : null,
          ['published', 'partial_failed'].includes(row.status)
            ? h(
                ElButton,
                { link: true, type: 'danger', onClick: () => handleArchive(row) },
                () => '归档'
              )
            : null,
          row.status === 'draft'
            ? h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openEditDialog(row) },
                () => '编辑'
              )
            : null,
          row.status === 'draft'
            ? h(
                ElButton,
                { link: true, type: 'danger', onClick: () => handleDeleteDraft(row) },
                () => '删除'
              )
            : null
        ])
    }
  ])

  const estimatedDeviceCount = computed(() => selectedTargetDevices.value.length)
  function formatFileSize(bytes: number) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function taskInstalledCount(task: ReleaseTask) {
    return task.deviceResults.filter((item) => item.status === 'installed').length
  }

  function taskFailedCount(task: ReleaseTask) {
    return task.deviceResults.filter((item) => item.status === 'failed').length
  }

  function taskPendingCount(task: ReleaseTask) {
    return task.deviceResults.filter((item) => ['pending', 'downloading'].includes(item.status))
      .length
  }

  function formatUpgradeProgress(task: ReleaseTask) {
    const total = task.deviceResults.length
    const installed = taskInstalledCount(task)
    const percentage = total ? Math.round((installed / total) * 100) : 0
    return `${percentage}% / ${installed}/${total} 台`
  }

  function getDevice(deviceId: number): Device | undefined {
    return publishTargets.value.find((device) => device.id === deviceId)
  }

  function applySearch() {
    Object.assign(appliedSearch, searchForm)
    pagination.current = 1
  }

  function resetSearch() {
    searchForm.keyword = ''
    applySearch()
  }

  function handleStatusTabChange() {
    pagination.current = 1
  }

  async function refreshData(showMessage = true) {
    loading.value = true
    try {
      await loadPublishTargets()
      await loadVersions()
      applySearch()
      if (showMessage) ElMessage.success('版本数据已刷新')
    } catch (error) {
      showRequestError(error)
    } finally {
      loading.value = false
    }
  }

  function handleSizeChange(size: number) {
    pagination.size = size
    pagination.current = 1
  }

  function handleCurrentChange(current: number) {
    pagination.current = current
  }

  function openCreateDialog() {
    editingRecord.value = undefined
    Object.assign(form, createEmptyForm())
    uploadFiles.value = []
    createDialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }

  function resetCreateForm() {
    editingRecord.value = undefined
    Object.assign(form, createEmptyForm())
    uploadFiles.value = []
    formRef.value?.clearValidate()
  }

  function openEditDialog(row: VersionRecord) {
    editingRecord.value = row
    Object.assign(form, {
      version: row.version,
      fileName: row.fileName,
      fileSize: row.fileSize,
      releaseNotes: row.releaseNotes
    })
    uploadFiles.value = []
    createDialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }

  function handleFileChange(uploadFile: UploadFile) {
    const file = uploadFile.raw
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.exe')) {
      ElMessage.warning('请选择 .exe 文件')
      uploadFiles.value = []
      Object.assign(form, { fileName: '', fileSize: 0 })
      return
    }
    if (file.size <= 0 || file.size > 500 * 1024 * 1024) {
      ElMessage.warning('软件安装包不能为空且不能超过 500 MB')
      uploadFiles.value = []
      Object.assign(form, { fileName: '', fileSize: 0 })
      return
    }
    Object.assign(form, { fileName: file.name, fileSize: file.size })
    formRef.value?.validateField('fileName')
  }

  function handleFileRemove() {
    Object.assign(
      form,
      editingRecord.value
        ? { fileName: editingRecord.value.fileName, fileSize: editingRecord.value.fileSize }
        : { fileName: '', fileSize: 0 }
    )
  }

  async function submitDraft() {
    if (savingDraft.value || !formRef.value) return
    savingDraft.value = true
    try {
      if (!(await formRef.value.validate().catch(() => false))) return
      const duplicated = versionRecords.value.some(
        (item) =>
          item.id !== editingRecord.value?.id &&
          item.version.toLowerCase() === form.version.trim().toLowerCase()
      )
      if (duplicated) return void ElMessage.warning('该版本号已存在')
      const file = uploadFiles.value[0]?.raw
      if (!editingRecord.value && !file) return void ElMessage.warning('请选择版本文件')
      const draft = {
        version: form.version.trim(),
        releaseNotes: form.releaseNotes.trim(),
        file
      }
      if (editingRecord.value) await updateVersionDraft(editingRecord.value.id, draft)
      else await addVersionDraft(draft)
      createDialogVisible.value = false
      activeStatusTab.value = 'unpublished'
      resetSearch()
      ElMessage.success(editingRecord.value ? '版本草稿已更新' : '版本草稿已保存')
    } catch (error) {
      showRequestError(error)
    } finally {
      savingDraft.value = false
    }
  }

  function openPublishDialog(row: VersionRecord) {
    currentRecord.value = row
    Object.assign(publishForm, {
      schoolIds: [0],
      rolloutPercentage: 100,
      scheduleMode: 'immediate',
      scheduledAt: undefined,
      mandatory: false
    })
    previousSchoolIds = [0]
    void loadPublishTargets()
    publishDialogVisible.value = true
  }

  async function submitPublish() {
    if (publishing.value || targetsLoading.value || targetsFailed.value || !currentRecord.value)
      return
    if (!publishForm.schoolIds.length) return void ElMessage.warning('请选择关联学校或全部')
    if (publishForm.scheduleMode === 'scheduled') {
      if (!publishForm.scheduledAt) return void ElMessage.warning('请选择定时下发时间')
      if (publishForm.scheduledAt.getTime() <= Date.now())
        return void ElMessage.warning('定时下发时间必须晚于当前时间')
    }
    publishing.value = true
    try {
      await createReleaseTask(currentRecord.value.id, {
        allSchools: publishForm.schoolIds.includes(0),
        schoolIds: publishForm.schoolIds.filter((id) => id !== 0),
        rolloutPercentage: publishForm.rolloutPercentage,
        mandatory: publishForm.mandatory,
        scheduledAt:
          publishForm.scheduleMode === 'scheduled'
            ? publishForm.scheduledAt?.toISOString()
            : undefined
      })
      publishDialogVisible.value = false
      activeStatusTab.value = publishForm.scheduleMode === 'scheduled' ? 'unpublished' : 'published'
      ElMessage.success(
        publishForm.scheduleMode === 'scheduled' ? '定时更新任务已创建' : '更新任务已开始下发'
      )
    } catch (error) {
      showRequestError(error)
    } finally {
      publishing.value = false
    }
  }

  async function openDetail(row: VersionRecord) {
    try {
      currentRecord.value = await loadVersionDetail(row.id)
      detailVisible.value = true
    } catch (error) {
      showRequestError(error)
    }
  }

  async function handlePause(row: VersionRecord) {
    try {
      await pauseReleaseTask(row.id)
      ElMessage.success('发布任务已暂停，不再向新设备下发')
    } catch (error) {
      showRequestError(error)
    }
  }

  async function handleResume(row: VersionRecord) {
    try {
      await resumeReleaseTask(row.id)
      ElMessage.success('发布任务已继续执行')
    } catch (error) {
      showRequestError(error)
    }
  }

  async function handleRetryDevice(deviceId: number) {
    if (!currentRecord.value) return
    try {
      currentRecord.value = await retryDeviceUpdate(currentRecord.value.id, deviceId)
      ElMessage.success('已重新加入更新队列')
    } catch (error) {
      showRequestError(error)
    }
  }

  async function handleCancelTask(row: VersionRecord) {
    try {
      await ElMessageBox.confirm(
        '取消后不会再向未开始更新的设备下发；已经完成更新的设备不会回滚。',
        `取消版本 ${row.version} 的发布任务`,
        { type: 'warning' }
      )
      await cancelReleaseTask(row.id)
      ElMessage.success('发布任务已取消')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') showRequestError(error)
    }
  }

  async function handleDeleteDraft(row: VersionRecord) {
    try {
      await ElMessageBox.confirm(`删除后将无法恢复版本“${row.version}”的草稿。`, '删除草稿', {
        type: 'warning'
      })
      await deleteVersionDraft(row.id)
      ElMessage.success('版本草稿已删除')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') showRequestError(error)
    }
  }

  async function handleArchive(row: VersionRecord) {
    try {
      await ElMessageBox.confirm(
        `归档后版本“${row.version}”不能再新建发布任务，已安装设备不会回滚。`,
        '归档版本',
        { type: 'warning' }
      )
      await archiveVersion(row.id)
      activeStatusTab.value = 'archived'
      ElMessage.success('版本已归档')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') showRequestError(error)
    }
  }

  function showRequestError(error: unknown) {
    const message = axios.isAxiosError(error)
      ? String(error.response?.data?.message || error.message)
      : error instanceof Error
        ? error.message
        : '操作失败，请稍后重试'
    ElMessage.error(message)
  }

  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let backgroundRefreshing = false
  function stopBackgroundRefresh() {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = undefined
  }
  function startBackgroundRefresh() {
    stopBackgroundRefresh()
    refreshTimer = setInterval(async () => {
      if (
        document.hidden ||
        loading.value ||
        backgroundRefreshing ||
        createDialogVisible.value ||
        publishDialogVisible.value
      )
        return
      backgroundRefreshing = true
      try {
        await loadVersions()
        if (detailVisible.value && currentRecord.value) {
          currentRecord.value = await loadVersionDetail(currentRecord.value.id)
        }
      } catch {
        // 后台断线保留已显示数据，手动刷新时再展示具体错误。
      } finally {
        backgroundRefreshing = false
      }
    }, 15_000)
  }
  onMounted(() => {
    void refreshData(false)
    startBackgroundRefresh()
  })
  onActivated(startBackgroundRefresh)
  onDeactivated(stopBackgroundRefresh)
  onBeforeUnmount(stopBackgroundRefresh)
</script>

<style scoped lang="scss">
  .version-page {
    box-sizing: border-box;
    min-height: 0;
    padding-bottom: 20px;
  }

  .page-heading {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .title-line {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .page-heading h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--art-text-gray-900);
  }

  .page-heading p {
    margin: 7px 0 0;
    font-size: 14px;
    color: var(--art-text-gray-600);
  }

  .stats-row {
    margin-bottom: 16px;
  }

  .stats-row :deep(.el-col) {
    margin-bottom: 12px;
  }

  .version-card :deep(.el-card__body) {
    min-height: 0;
    padding-top: 6px;
  }

  .toolbar,
  .filters {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .toolbar {
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .status-tabs :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }

  .keyword-input {
    width: 320px;
  }

  :deep(.version-cell),
  :deep(.file-cell),
  :deep(.table-actions) {
    display: flex;
    align-items: center;
  }

  :deep(.version-cell) {
    gap: 8px;
  }

  :deep(.file-cell) {
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.file-cell small) {
    margin-top: 3px;
    color: var(--art-text-gray-500);
  }

  :deep(.table-actions) {
    gap: 2px;
  }

  :deep(.upgrade-progress-text) {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--art-text-gray-800);
  }

  .package-editor,
  .version-uploader,
  .version-uploader :deep(.el-upload) {
    width: 100%;
  }

  .current-package {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    margin-bottom: 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .current-package-icon {
    flex: none;
    font-size: 26px;
    color: var(--theme-color);
  }

  .current-package-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    line-height: 1.5;
  }

  .current-package-info span,
  .current-package-info small {
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .current-package-info strong {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-icon {
    margin-bottom: 8px;
    font-size: 42px;
    color: var(--theme-color);
  }

  .rollout-field {
    display: flex;
    gap: 18px;
    align-items: center;
    width: 100%;
  }

  .rollout-field :deep(.el-slider) {
    flex: 1;
  }

  .rollout-field span {
    width: 42px;
    font-weight: 600;
    text-align: right;
  }

  .field-help {
    margin-left: 12px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .detail-version {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding-bottom: 20px;
  }

  .package-icon {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    font-size: 27px;
    color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    border-radius: 12px;
  }

  .detail-version h2,
  .detail-version p,
  .detail-section h3,
  .detail-section p {
    margin: 0;
  }

  .detail-version h2 {
    font-size: 20px;
  }

  .detail-version p {
    margin-top: 5px;
    color: var(--art-text-gray-500);
    overflow-wrap: anywhere;
  }

  .detail-descriptions {
    margin-bottom: 24px;
  }

  .detail-descriptions :deep(.el-descriptions__table) {
    width: 100%;
    table-layout: fixed;
  }

  .detail-descriptions :deep(.el-descriptions__label) {
    width: 100px;
    white-space: nowrap;
  }

  .detail-descriptions :deep(.el-descriptions__content) {
    overflow-wrap: anywhere;
  }

  .detail-section {
    padding: 18px;
    margin-top: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
  }

  .detail-section h3 {
    margin-bottom: 10px;
    font-size: 15px;
  }

  .detail-section p {
    line-height: 1.7;
    color: var(--art-text-gray-700);
    overflow-wrap: anywhere;
  }

  .section-heading,
  .progress-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .progress-summary {
    margin-top: 14px;
    font-size: 12px;
    color: var(--art-text-gray-600);
  }

  .device-result-table {
    margin-top: 16px;
  }

  .device-result-table small {
    color: var(--art-text-gray-500);
  }

  .task-history-item {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .task-history-item:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .task-history-item p {
    margin-top: 4px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 5px;
    border-radius: 50%;
  }

  .dot.success {
    background: var(--art-success);
  }

  .dot.waiting {
    background: var(--art-warning);
  }

  .dot.failed {
    background: var(--art-error);
  }

  @media (width <= 900px) {
    .page-heading,
    .toolbar,
    .filters {
      align-items: stretch;
    }

    .page-heading,
    .toolbar {
      flex-direction: column;
    }

    .filters {
      flex-wrap: wrap;
    }

    .keyword-input {
      width: 100%;
    }
  }
</style>
