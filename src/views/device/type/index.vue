<template>
  <div class="device-model-page art-full-height">
    <ElCard class="search-card" shadow="never">
      <ElForm :model="searchForm" inline @submit.prevent="handleSearch">
        <ElFormItem label="型号名称">
          <ElInput v-model="searchForm.keyword" clearable placeholder="请输入型号名称或编码" />
        </ElFormItem>
        <ElFormItem label="生产厂商">
          <ElInput v-model="searchForm.manufacturer" clearable placeholder="请输入生产厂商" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="searchForm.status"
            clearable
            placeholder="全部状态"
            style="width: 140px"
          >
            <ElOption label="启用" value="enabled" />
            <ElOption label="停用" value="disabled" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard class="art-table-card">
      <ArtTableHeader
        v-model:columns="columnChecks"
        :show-zebra="false"
        layout="refresh,size,fullscreen,columns,settings"
        @refresh="refreshData"
      >
        <template #left>
          <ElButton v-ripple @click="openDialog('add')">新增型号</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :data="pagedModels"
        :columns="columns"
        :pagination="pagination"
        :stripe="false"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增设备型号' : '编辑设备型号'"
      width="760px"
      align-center
      :close-on-click-modal="false"
      @closed="formRef?.resetFields()"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="型号图片" prop="image">
              <div class="model-image-field">
                <ElUpload
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/png,image/jpeg,image/webp"
                  :on-change="handleImageChange"
                >
                  <div class="model-image-uploader">
                    <ElImage v-if="form.image" :src="form.image" fit="contain" />
                    <div v-else class="model-image-placeholder">
                      <ArtSvgIcon icon="ri:image-add-line" />
                      <span>上传型号图片</span>
                    </div>
                  </div>
                </ElUpload>
                <div class="model-image-help">
                  <span>支持 JPG、PNG、WebP，建议使用方形或透明背景图片，不超过 5MB</span>
                  <ElButton v-if="form.image" link type="danger" @click="form.image = ''">
                    移除图片
                  </ElButton>
                </div>
              </div>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="型号名称" prop="modelName">
              <ElInput v-model="form.modelName" maxlength="80" placeholder="请输入型号名称" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="型号编码" prop="modelCode">
              <ElInput v-model="form.modelCode" maxlength="50" placeholder="如 DM-55-A01" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="生产厂商" prop="manufacturer">
              <ElInput v-model="form.manufacturer" maxlength="80" placeholder="请输入生产厂商" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="操作系统">
              <ElInput v-model="form.operatingSystem" maxlength="80" placeholder="如 Android 13" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8"
            ><ElFormItem label="CPU"><ElInput v-model="form.cpu" /></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="内存"
              ><ElInput v-model="form.memory" placeholder="如 8 GB" /></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="存储"
              ><ElInput v-model="form.storage" placeholder="如 128 GB" /></ElFormItem
          ></ElCol>
          <ElCol :span="8">
            <ElFormItem label="屏幕尺寸">
              <ElInputNumber
                v-model="form.screenSize"
                :min="1"
                :max="200"
                :precision="1"
                class="!w-full"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8"
            ><ElFormItem label="分辨率"
              ><ElInput v-model="form.resolution" placeholder="如 3840×2160" /></ElFormItem
          ></ElCol>
          <ElCol :span="8">
            <ElFormItem label="屏幕方向">
              <ElSelect v-model="form.orientation" class="w-full">
                <ElOption label="横屏" value="landscape" />
                <ElOption label="竖屏" value="portrait" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="支持触控"><ElSwitch v-model="form.touchSupported" /></ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="启用状态"><ElSwitch v-model="enabled" /></ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="备注">
              <ElInput
                v-model="form.remark"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElMessage,
    ElMessageBox,
    ElTag,
    type FormInstance,
    type FormRules,
    type UploadFile
  } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { formatDateTime } from '@/utils/date'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import {
    deviceModels,
    getModelDeviceCount,
    removeDeviceModel,
    saveDeviceModel,
    type DeviceModel,
    type DeviceModelMutation
  } from '../shared/device-store'

  defineOptions({ name: 'DeviceType' })

  const searchForm = reactive({ keyword: '', manufacturer: '', status: '' })
  const appliedSearch = reactive({ keyword: '', manufacturer: '', status: '' })
  const pagination = reactive({ current: 1, size: 20, total: 0 })
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const editingId = ref<number>()
  const formRef = ref<FormInstance>()
  const createEmptyForm = (): DeviceModelMutation => ({
    modelCode: '',
    modelName: '',
    image: '',
    manufacturer: '',
    operatingSystem: '',
    cpu: '',
    memory: '',
    storage: '',
    screenSize: undefined,
    resolution: '',
    orientation: 'landscape',
    touchSupported: true,
    status: 'enabled',
    remark: ''
  })
  const form = reactive<DeviceModelMutation>(createEmptyForm())
  const enabled = computed({
    get: () => form.status === 'enabled',
    set: (value: boolean) => (form.status = value ? 'enabled' : 'disabled')
  })
  const rules: FormRules = {
    image: [{ required: true, message: '请上传型号图片', trigger: 'change' }],
    modelName: [{ required: true, message: '请输入型号名称', trigger: 'blur' }],
    modelCode: [
      { required: true, message: '请输入型号编码', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线和短横线', trigger: 'blur' }
    ],
    manufacturer: [{ required: true, message: '请输入生产厂商', trigger: 'blur' }]
  }

  const filteredModels = computed(() => {
    const keyword = appliedSearch.keyword.trim().toLowerCase()
    const manufacturer = appliedSearch.manufacturer.trim().toLowerCase()
    return deviceModels.value.filter(
      (item) =>
        (!keyword || `${item.modelName} ${item.modelCode}`.toLowerCase().includes(keyword)) &&
        (!manufacturer || item.manufacturer.toLowerCase().includes(manufacturer)) &&
        (!appliedSearch.status || item.status === appliedSearch.status)
    )
  })
  const pagedModels = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredModels.value.slice(start, start + pagination.size)
  })
  watch(
    filteredModels,
    (rows) => {
      pagination.total = rows.length
      const maxPage = Math.max(1, Math.ceil(rows.length / pagination.size))
      if (pagination.current > maxPage) pagination.current = maxPage
    },
    { immediate: true }
  )
  const { columns, columnChecks } = useTableColumns<DeviceModel>(() => [
    { type: 'globalIndex', label: '序号', width: 70, fixed: 'left' },
    {
      prop: 'image',
      label: '型号图片',
      width: 100,
      fixed: 'left',
      formatter: (row) =>
        row.image
          ? h(ElImage, {
              src: row.image,
              fit: 'contain',
              previewSrcList: [row.image],
              previewTeleported: true,
              style: {
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                background: 'var(--el-fill-color-light)'
              }
            })
          : h('span', { class: 'text-g-400' }, '暂无图片')
    },
    { prop: 'modelCode', label: '型号编码', minWidth: 140, fixed: 'left' },
    {
      prop: 'modelName',
      label: '型号名称',
      minWidth: 220,
      fixed: 'left',
      showOverflowTooltip: true
    },
    { prop: 'manufacturer', label: '生产厂商', minWidth: 160, showOverflowTooltip: true },
    { prop: 'operatingSystem', label: '操作系统', minWidth: 150, showOverflowTooltip: true },
    { prop: 'cpu', label: 'CPU 配置', minWidth: 160, showOverflowTooltip: true },
    { prop: 'memory', label: '内存配置', minWidth: 110 },
    { prop: 'storage', label: '存储配置', minWidth: 120 },
    {
      prop: 'screenSize',
      label: '屏幕尺寸',
      width: 110,
      formatter: (row) => (row.screenSize ? `${row.screenSize} 英寸` : '-')
    },
    {
      prop: 'resolution',
      label: '分辨率',
      minWidth: 130,
      formatter: (row) => row.resolution || '-'
    },
    {
      prop: 'orientation',
      label: '屏幕方向',
      width: 100,
      formatter: (row) => (row.orientation === 'landscape' ? '横屏' : '竖屏')
    },
    {
      prop: 'touchSupported',
      label: '触控支持',
      width: 100,
      formatter: (row) => (row.touchSupported ? '支持' : '不支持')
    },
    {
      prop: 'deviceCount',
      label: '关联设备',
      width: 100,
      formatter: (row) => getModelDeviceCount(row.id)
    },
    {
      prop: 'status',
      label: '状态',
      width: 90,
      formatter: (row) =>
        h(ElTag, { type: row.status === 'enabled' ? 'success' : 'info' }, () =>
          row.status === 'enabled' ? '启用' : '停用'
        )
    },
    {
      prop: 'remark',
      label: '备注',
      minWidth: 180,
      showOverflowTooltip: true,
      formatter: (row) => row.remark || '-'
    },
    {
      prop: 'createdAt',
      label: '创建时间',
      width: 180,
      sortable: true,
      formatter: (row) => formatDateTime(row.createdAt)
    },
    {
      prop: 'updatedAt',
      label: '更新时间',
      width: 180,
      sortable: true,
      formatter: (row) => formatDateTime(row.updatedAt)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 120,
      fixed: 'right',
      disabled: true,
      formatter: (row) =>
        h('div', { class: 'flex items-center' }, [
          h(ArtButtonTable, { type: 'edit', onClick: () => openDialog('edit', row) }),
          h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
        ])
    }
  ])
  const handleSearch = () => {
    Object.assign(appliedSearch, searchForm)
    pagination.current = 1
  }
  const handleReset = () => {
    Object.assign(searchForm, { keyword: '', manufacturer: '', status: '' })
    handleSearch()
  }
  const refreshData = () => {
    handleSearch()
    ElMessage.success('数据已刷新')
  }
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }
  const handleCurrentChange = (current: number) => {
    pagination.current = current
  }
  const openDialog = (type: 'add' | 'edit', row?: DeviceModel) => {
    dialogType.value = type
    editingId.value = row?.id
    Object.assign(
      form,
      row
        ? {
            modelCode: row.modelCode,
            modelName: row.modelName,
            image: row.image,
            manufacturer: row.manufacturer,
            operatingSystem: row.operatingSystem,
            cpu: row.cpu,
            memory: row.memory,
            storage: row.storage,
            screenSize: row.screenSize,
            resolution: row.resolution,
            orientation: row.orientation,
            touchSupported: row.touchSupported,
            status: row.status,
            remark: row.remark
          }
        : createEmptyForm()
    )
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
  const handleImageChange = (uploadFile: UploadFile) => {
    const file = uploadFile.raw
    if (!file) return
    if (!file.type.startsWith('image/')) {
      ElMessage.warning('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning('型号图片不能超过 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      form.image = String(reader.result ?? '')
      formRef.value?.validateField('image')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!formRef.value || !(await formRef.value.validate())) return
    const duplicated = deviceModels.value.some(
      (item) =>
        item.modelCode.toLowerCase() === form.modelCode.trim().toLowerCase() &&
        item.id !== editingId.value
    )
    if (duplicated) return void ElMessage.warning('型号编码已存在')
    saveDeviceModel(
      { ...form, modelCode: form.modelCode.trim(), modelName: form.modelName.trim() },
      editingId.value
    )
    dialogVisible.value = false
    ElMessage.success(dialogType.value === 'add' ? '型号新增成功' : '型号修改成功')
  }
  const handleDelete = async (row: DeviceModel) => {
    if (getModelDeviceCount(row.id)) return void ElMessage.warning('该型号已关联设备，无法删除')
    try {
      await ElMessageBox.confirm(`确定删除型号“${row.modelName}”吗？`, '删除型号', {
        type: 'warning'
      })
      removeDeviceModel(row.id)
      ElMessage.success('型号删除成功')
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') throw error
    }
  }
</script>

<style scoped lang="scss">
  .model-image-field {
    width: 100%;
  }

  .model-image-uploader {
    width: 132px;
    height: 132px;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-lighter);
    border: 1px dashed var(--el-border-color);
    border-radius: 10px;
    transition: border-color 0.2s ease;
  }

  .model-image-uploader:hover {
    border-color: var(--el-color-primary);
  }

  .model-image-uploader :deep(.el-image) {
    width: 100%;
    height: 100%;
    border-radius: 10px;
  }

  .model-image-placeholder {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .model-image-placeholder svg {
    font-size: 28px;
  }

  .model-image-help {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .search-card {
    margin-bottom: 12px;
  }

  .search-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .search-card :deep(.el-form-item) {
    margin-bottom: 16px;
  }
</style>
