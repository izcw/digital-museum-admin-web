<template>
  <div class="collection-editor-page art-full-height" v-loading="loading">
    <ElCard class="editor-page-header" shadow="never">
      <div class="editor-heading">
        <ElButton class="back-button" circle aria-label="返回藏品管理" @click="goBack">
          <ArtSvgIcon icon="ri:arrow-left-line" />
        </ElButton>
        <div>
          <h2>{{ isEditing ? '编辑藏品' : '新增藏品' }}</h2>
          <p>{{ isEditing ? `正在维护“${originalTitle}”的资料` : '创建一件新的数字藏品资料' }}</p>
        </div>
      </div>
      <div class="editor-actions">
        <ElButton @click="goBack">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveDraft">
          <ArtSvgIcon icon="ri:save-line" />
          保存
        </ElButton>
      </div>
    </ElCard>

    <ElCard class="editor-content-card" shadow="never">
      <ElAlert
        title="资料、图集顺序和 3D 模型将保存到服务端；发布后客户端才能加载该藏品。"
        type="success"
        :closable="false"
        show-icon
        class="page-alert"
      />

      <ElTabs v-model="editorTab" class="editor-tabs">
        <ElTabPane name="text">
          <template #label>
            <span class="tab-label"><ArtSvgIcon icon="ri:file-text-line" />文本资料</span>
          </template>
          <ElForm :model="draft" label-position="top" class="text-form">
            <ElRow :gutter="18">
              <ElCol :span="24">
                <div class="publish-setting">
                  <div>
                    <strong>发布状态</strong>
                    <p>发布后客户端才能加载并展示该藏品。</p>
                  </div>
                  <ElSwitch
                    v-model="draft.published"
                    inline-prompt
                    active-text="已发布"
                    inactive-text="未发布"
                    :width="72"
                  />
                </div>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="藏品名称" required>
                  <ElInput v-model="draft.title" placeholder="请输入藏品名称" />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="分类" required>
                  <ElSelect v-model="draft.category" class="w-full">
                    <ElOption
                      v-for="category in categories.slice(1)"
                      :key="category"
                      :label="category"
                      :value="category"
                    />
                  </ElSelect>
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="8">
                <ElFormItem label="年代">
                  <ElSelect
                    v-model="draft.period"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="请选择或输入年代"
                    class="w-full"
                  >
                    <ElOption
                      v-for="period in periodOptions"
                      :key="period.value"
                      :label="period.label"
                      :value="period.value"
                    />
                  </ElSelect>
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="8">
                <ElFormItem label="材质"><ElInput v-model="draft.material" /></ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="8">
                <ElFormItem label="文物级别"><ElInput v-model="draft.level" /></ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="馆藏单位"><ElInput v-model="draft.museum" /></ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="尺寸"><ElInput v-model="draft.dimensions" /></ElFormItem>
              </ElCol>
              <ElCol :span="24">
                <ElFormItem label="文物介绍（Markdown）" class="markdown-form-item">
                  <MarkdownEditor v-model="draft.description" />
                </ElFormItem>
              </ElCol>
            </ElRow>
          </ElForm>
        </ElTabPane>

        <ElTabPane name="gallery">
          <template #label>
            <span class="tab-label">
              <ArtSvgIcon icon="ri:image-2-line" />图集
              <ElBadge :value="editorGallery.length" type="info" />
            </span>
          </template>
          <div class="asset-panel">
            <div class="asset-panel-header">
              <div>
                <h3>藏品图集</h3>
                <p>第一张图片将作为藏品卡片封面，拖动图片下方的手柄可调整顺序。</p>
              </div>
              <ElUpload
                multiple
                accept="image/jpeg,image/png,image/webp"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleGalleryChange"
              >
                <ElButton type="primary"><ArtSvgIcon icon="ri:add-line" />添加图片</ElButton>
              </ElUpload>
            </div>
            <VueDraggable
              v-if="editorGallery.length"
              v-model="editorGallery"
              class="gallery-editor-grid"
              :class="{ 'is-sorting': galleryDragging }"
              handle=".gallery-drag-handle"
              ghost-class="gallery-drag-placeholder"
              chosen-class="gallery-drag-chosen"
              drag-class="gallery-dragging"
              fallback-class="gallery-drag-fallback"
              :force-fallback="true"
              :fallback-on-body="true"
              :fallback-tolerance="4"
              :animation="220"
              easing="cubic-bezier(0.22, 1, 0.36, 1)"
              :swap-threshold="0.55"
              :invert-swap="true"
              :inverted-swap-threshold="0.72"
              :scroll="true"
              :scroll-sensitivity="80"
              :scroll-speed="10"
              :bubble-scroll="true"
              @start="handleGalleryDragStart"
              @end="handleGalleryDragEnd"
              @unchoose="handleGalleryDragEnd"
            >
              <div v-for="(image, index) in editorGallery" :key="image" class="gallery-editor-item">
                <div class="gallery-editor-media">
                  <ElImage
                    :src="image"
                    :preview-src-list="editorGallery"
                    :initial-index="index"
                    fit="contain"
                    preview-teleported
                    show-progress
                    @show="setImagePreviewBackground(true)"
                    @close="setImagePreviewBackground(false)"
                  />
                  <span v-if="index === 0" class="cover-label">封面</span>
                  <div class="gallery-item-actions">
                    <ElButton
                      text
                      circle
                      type="danger"
                      aria-label="移除图片"
                      @click="removeGalleryImage(index)"
                    >
                      <ArtSvgIcon icon="ri:delete-bin-line" />
                    </ElButton>
                  </div>
                </div>
                <div class="gallery-item-footer">
                  <span>{{ index + 1 }}/{{ editorGallery.length }}</span>
                  <button class="gallery-drag-handle" type="button" aria-label="拖拽调整顺序">
                    <ArtSvgIcon icon="ri:drag-move-2-line" />
                    移动
                  </button>
                </div>
              </div>
            </VueDraggable>
            <ElEmpty v-else description="尚未添加藏品图片" :image-size="90" />
          </div>
        </ElTabPane>

        <ElTabPane name="model">
          <template #label>
            <span class="tab-label">
              <ArtSvgIcon icon="ri:box-3-line" />3D 模型
              <span v-if="editorModelName" class="status-dot"></span>
            </span>
          </template>
          <div class="asset-panel model-panel">
            <div v-if="editorModelName" class="editor-model-config">
              <div class="model-preview">
                <div class="model-preview-grid"></div>
                <div class="model-preview-content">
                  <span class="model-preview-icon"><ArtSvgIcon icon="ri:box-3-line" /></span>
                  <strong>{{ editorModelName }}</strong>
                  <small>GLB 三维模型</small>
                </div>
                <span class="model-preview-hint">
                  <ArtSvgIcon icon="ri:drag-move-2-line" />模型预览器接入后可旋转查看
                </span>
              </div>
              <div class="model-file-card">
                <div class="model-file-icon"><ArtSvgIcon icon="ri:file-3-line" /></div>
                <div class="model-file-info">
                  <strong>{{ editorModelName }}</strong>
                  <span>当前模型资源 · GLB 格式</span>
                </div>
                <ElButton type="danger" plain @click="removeModel">移除模型</ElButton>
              </div>
            </div>
            <ElUpload
              v-else
              drag
              accept=".glb,model/gltf-binary"
              :auto-upload="false"
              :limit="1"
              :show-file-list="false"
              :on-change="handleModelChange"
            >
              <ArtSvgIcon icon="ri:box-3-line" class="model-upload-icon" />
              <div class="el-upload__text">将 GLB 文件拖到此处，或 <em>点击选择</em></div>
              <template #tip>
                <div class="el-upload__tip">仅支持 GLB 格式，建议使用经过压缩的兼容版本。</div>
              </template>
            </ElUpload>
            <ElAlert
              title="模型保存后，藏品卡片右上角将显示 3D 标识。"
              type="info"
              :closable="false"
              show-icon
              class="model-tip"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type UploadFile } from 'element-plus'
  import { VueDraggable } from 'vue-draggable-plus'
  import MarkdownEditor from '@/views/ai/knowledge/components/MarkdownEditor.vue'
  import {
    appendCollectionGallery,
    createCollection,
    deleteCollectionModel,
    fetchCollection,
    reorderCollectionGallery,
    replaceCollectionModel,
    updateCollection
  } from '@/api/collections'
  import {
    categories,
    collections,
    periodOptions,
    type Category,
    type CollectionItem
  } from '../collection-data'

  defineOptions({ name: 'CollectEditor' })

  const route = useRoute()
  const router = useRouter()
  const routeId = computed(() => {
    const id = route.params.id
    return Array.isArray(id) ? id[0] || '' : id || ''
  })
  const editingItem = ref<CollectionItem>()
  const isEditing = computed(() => Boolean(routeId.value))
  const originalTitle = computed(() => editingItem.value?.title || '未知藏品')
  const editorTab = ref<'text' | 'gallery' | 'model'>('text')
  const editorGallery = ref<string[]>([])
  const galleryDragging = ref(false)
  const editorModelName = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const newGalleryFiles = new Map<string, File>()
  const galleryPathByUrl = new Map<string, string>()
  const objectUrls = new Set<string>()
  const modelFile = ref<File>()
  const modelRemoved = ref(false)
  const draft = reactive({
    title: '',
    category: '其他' as Category,
    period: '',
    material: '',
    level: '',
    museum: '',
    dimensions: '',
    description: '',
    published: false
  })

  async function loadDraft() {
    loading.value = true
    let item: CollectionItem | undefined
    try {
      item = routeId.value ? await fetchCollection(routeId.value) : undefined
      editingItem.value = item
      if (item) {
        const index = collections.value.findIndex((entry) => entry.id === item?.id)
        if (index >= 0) collections.value.splice(index, 1, item)
        else collections.value.unshift(item)
      }
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '未找到要编辑的藏品')
      await router.replace({ name: 'Collect' })
      return
    } finally {
      loading.value = false
    }
    newGalleryFiles.clear()
    galleryPathByUrl.clear()
    editorGallery.value = item ? [...item.gallery] : []
    item?.gallery.forEach((url, index) =>
      galleryPathByUrl.set(url, item?.galleryPaths?.[index] || url)
    )
    editorModelName.value = item?.modelName || ''
    modelFile.value = undefined
    modelRemoved.value = false
    Object.assign(draft, {
      title: item?.title || '',
      category: item?.category || '其他',
      period: item?.period || '',
      material: item?.material || '',
      level: item?.level || '',
      museum: item?.museum || '',
      dimensions: item?.dimensions || '',
      description: item?.description || '',
      published: item?.published || false
    })
    if (route.query.imported === '1') ElMessage.success('资源包已导入，请核对并完善藏品资料')
  }

  function goBack() {
    void router.push({
      name: 'Collect',
      query: { status: draft.published ? 'published' : 'unpublished' }
    })
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      editorTab.value = 'text'
      ElMessage.warning('请填写藏品名称')
      return
    }
    saving.value = true
    try {
      const payload = { ...draft, level: draft.level || '' }
      let saved = editingItem.value
        ? await updateCollection(editingItem.value.id, payload)
        : await createCollection(payload)

      const newUrls = editorGallery.value.filter((url) => newGalleryFiles.has(url))
      const beforeUploadCount = saved.galleryPaths?.length || 0
      if (newUrls.length) {
        saved = await appendCollectionGallery(
          saved.id,
          newUrls.map((url) => newGalleryFiles.get(url)!)
        )
        const addedPaths = (saved.galleryPaths || []).slice(beforeUploadCount)
        newUrls.forEach((url, index) => {
          galleryPathByUrl.set(url, addedPaths[index])
          newGalleryFiles.delete(url)
        })
      }
      const order = editorGallery.value
        .map((url) => galleryPathByUrl.get(url))
        .filter((path): path is string => Boolean(path))
      saved = await reorderCollectionGallery(saved.id, order)

      if (modelFile.value) saved = await replaceCollectionModel(saved.id, modelFile.value)
      else if (modelRemoved.value && editingItem.value?.hasModel)
        saved = await deleteCollectionModel(saved.id)

      const index = collections.value.findIndex((item) => item.id === saved.id)
      if (index >= 0) collections.value.splice(index, 1, saved)
      else collections.value.unshift(saved)
      ElMessage.success(editingItem.value ? '藏品资料已更新' : '藏品已添加')
      goBack()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '藏品保存失败')
    } finally {
      saving.value = false
    }
  }

  function handleGalleryChange(file: UploadFile) {
    if (!file.raw) return
    if (!file.raw.type.startsWith('image/')) {
      ElMessage.warning('请选择 JPG、PNG 或 WebP 图片')
      return
    }
    const url = URL.createObjectURL(file.raw)
    objectUrls.add(url)
    newGalleryFiles.set(url, file.raw)
    editorGallery.value.push(url)
  }

  function removeGalleryImage(index: number) {
    const [url] = editorGallery.value.splice(index, 1)
    newGalleryFiles.delete(url)
  }

  function handleGalleryDragStart() {
    galleryDragging.value = true
    document.body.classList.add('collection-gallery-dragging')
  }

  function handleGalleryDragEnd() {
    galleryDragging.value = false
    document.body.classList.remove('collection-gallery-dragging')
  }

  function handleModelChange(file: UploadFile) {
    const fileName = file.name || file.raw?.name || ''
    if (!fileName.toLowerCase().endsWith('.glb')) {
      ElMessage.warning('请选择 GLB 格式的三维模型')
      return
    }
    editorModelName.value = fileName
    modelFile.value = file.raw
    modelRemoved.value = false
  }

  function removeModel() {
    editorModelName.value = ''
    modelFile.value = undefined
    modelRemoved.value = true
  }

  function setImagePreviewBackground(visible: boolean) {
    document.body.classList.toggle('collection-image-preview', visible)
  }

  watch(routeId, () => void loadDraft(), { immediate: true })

  onBeforeUnmount(() => {
    document.body.classList.remove('collection-image-preview')
    document.body.classList.remove('collection-gallery-dragging')
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
  })
</script>

<style scoped lang="scss">
  .collection-editor-page {
    min-height: 0;
    padding-bottom: 24px;
    overflow: hidden auto;
    overscroll-behavior-y: contain;
    scrollbar-gutter: stable;

    > * {
      flex-shrink: 0;
    }
  }

  .editor-page-header {
    margin-bottom: 16px;
    border: 0;

    :deep(.el-card__body),
    .editor-heading,
    .editor-actions {
      display: flex;
      align-items: center;
    }

    :deep(.el-card__body) {
      justify-content: space-between;
      min-height: 82px;
      padding: 18px 24px;
    }
  }

  .editor-heading {
    gap: 14px;

    h2 {
      margin: 0 0 5px;
      font-size: 21px;
      color: var(--art-text-gray-900);
    }

    p {
      margin: 0;
      font-size: 13px;
      color: var(--art-text-gray-500);
    }
  }

  .back-button {
    flex: 0 0 auto;
    font-size: 18px;
  }

  .editor-actions {
    gap: 10px;

    :deep(.art-svg-icon) {
      margin-right: 5px;
    }
  }

  .editor-content-card {
    min-height: calc(100vh - 200px);
    border: 0;

    :deep(.el-card__body) {
      padding: 24px;
    }
  }

  .page-alert {
    margin-bottom: 20px;
  }

  .editor-tabs :deep(.el-tabs__header) {
    margin-bottom: 24px;
  }

  .tab-label {
    display: inline-flex;
    gap: 7px;
    align-items: center;

    :deep(.el-badge__content) {
      position: static;
      margin-left: 1px;
      transform: none;
    }
  }

  .status-dot {
    width: 7px;
    height: 7px;
    background: var(--el-color-success);
    border-radius: 50%;
  }

  .text-form {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  .publish-setting {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    margin-bottom: 18px;
    background: var(--art-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 8px;

    strong {
      font-size: 14px;
      color: var(--art-text-gray-900);
    }

    p {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .markdown-form-item {
    margin-bottom: 0;

    :deep(.el-form-item__content) {
      display: block;
    }

    :deep(.markdown-editor),
    :deep(.markdown-editor .milkdown) {
      min-height: 380px;
    }
  }

  .asset-panel {
    min-height: 500px;
  }

  .asset-panel-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 22px;

    h3 {
      margin: 0 0 6px;
      font-size: 16px;
      color: var(--art-text-gray-900);
    }

    p {
      margin: 0;
      font-size: 13px;
      color: var(--art-text-gray-500);
    }
  }

  .gallery-editor-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 14px;

    &.is-sorting {
      cursor: grabbing;

      .gallery-editor-item {
        will-change: transform;
      }

      .gallery-item-actions {
        pointer-events: none;
        opacity: 0;
      }
    }
  }

  .gallery-editor-item {
    position: relative;
    overflow: hidden;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 9px;
    transition:
      box-shadow 0.26s ease,
      opacity 0.2s ease;

    &:hover {
      box-shadow: 0 8px 22px rgb(0 0 0 / 9%);
    }

    &:hover .gallery-item-actions {
      opacity: 1;
    }
  }

  .gallery-editor-media {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #f6f7f8;

    :deep(.el-image) {
      box-sizing: border-box;
      display: block;
      width: 100%;
      height: 100%;
      padding: 6px;
    }

    :deep(.el-image__inner) {
      max-width: 100%;
      max-height: 100%;
    }
  }

  .cover-label {
    position: absolute;
    top: 9px;
    left: 9px;
    padding: 3px 8px;
    font-size: 11px;
    color: #fff;
    background: rgb(20 27 24 / 65%);
    border-radius: 10px;
  }

  .gallery-item-actions {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px;
    background: rgb(255 255 255 / 92%);
    border-radius: 18px;
    box-shadow: 0 3px 10px rgb(0 0 0 / 12%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .gallery-item-footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 8px 10px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .gallery-drag-handle {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 3px 5px;
    font-size: 11px;
    color: var(--art-text-gray-600);
    cursor: grab;
    background: transparent;
    border: 0;
    border-radius: 4px;

    &:hover {
      color: var(--main-color);
      background: var(--el-color-primary-light-9);
    }
  }

  .gallery-drag-placeholder {
    position: relative;
    background: var(--el-color-primary-light-9);
    border: 2px dashed var(--main-color);
    box-shadow: none;
    opacity: 1;
    animation:
      gallery-placeholder-enter 0.2s ease-out,
      gallery-placeholder-pulse 1.1s 0.2s ease-in-out infinite;

    > * {
      visibility: hidden;
    }

    &::after {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--main-color);
      content: '释放到此处';
      animation: gallery-placeholder-label 0.72s ease-in-out infinite alternate;
    }
  }

  @keyframes gallery-placeholder-enter {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes gallery-placeholder-pulse {
    0%,
    100% {
      background: var(--el-color-primary-light-9);
      box-shadow: 0 0 0 0 rgb(64 158 255 / 0%);
    }

    50% {
      background: var(--el-color-primary-light-8);
      box-shadow: 0 0 0 5px rgb(64 158 255 / 15%);
    }
  }

  @keyframes gallery-placeholder-label {
    from {
      opacity: 0.58;
      transform: translateY(2px);
    }

    to {
      opacity: 1;
      transform: translateY(-2px);
    }
  }

  .gallery-drag-chosen {
    z-index: 3;
    box-shadow: 0 10px 26px rgb(0 0 0 / 14%);
  }

  .gallery-dragging {
    cursor: grabbing;
    box-shadow: 0 14px 30px rgb(0 0 0 / 18%);
    opacity: 0.88;
  }

  :global(.gallery-drag-fallback) {
    z-index: 9999 !important;
    pointer-events: none !important;
    box-shadow: 0 16px 34px rgb(0 0 0 / 20%);
    opacity: 0.94 !important;
  }

  :global(body.collection-gallery-dragging) {
    cursor: grabbing !important;
    user-select: none;
  }

  .model-panel {
    max-width: 780px;
    margin: 0 auto;
  }

  .model-preview {
    position: relative;
    height: 330px;
    margin-bottom: 16px;
    overflow: hidden;
    color: #fff;
    background: radial-gradient(circle at 50% 42%, #37404e 0, #202630 44%, #161a21 100%);
    border-radius: 12px;
  }

  .model-preview-grid {
    position: absolute;
    right: -12%;
    bottom: -64%;
    left: -12%;
    height: 100%;
    background-image:
      linear-gradient(rgb(255 255 255 / 16%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 16%) 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.28;
    transform: perspective(360px) rotateX(62deg);
    transform-origin: center top;
  }

  .model-preview-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    strong {
      margin-top: 16px;
      font-size: 16px;
      font-weight: 500;
    }

    small {
      margin-top: 6px;
      color: rgb(255 255 255 / 58%);
    }
  }

  .model-preview-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 90px;
    font-size: 48px;
    background: rgb(255 255 255 / 9%);
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 24px;
  }

  .model-preview-hint {
    position: absolute;
    right: 16px;
    bottom: 14px;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    color: rgb(255 255 255 / 48%);
  }

  .model-file-card {
    display: flex;
    gap: 18px;
    align-items: center;
    padding: 22px;
    background: var(--art-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .model-file-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    font-size: 27px;
    color: var(--main-color);
    background: var(--el-color-primary-light-9);
    border-radius: 10px;
  }

  .model-file-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 5px;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 15px;
      color: var(--art-text-gray-900);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .model-upload-icon {
    margin: 42px 0 14px;
    font-size: 64px;
    color: var(--main-color);
  }

  .model-tip {
    margin-top: 20px;
  }

  :global(body.collection-image-preview .el-image-viewer__mask) {
    background: #fff;
    opacity: 1;
  }

  :global(body.collection-image-preview .el-image-viewer__btn) {
    color: #303133;
    background: rgb(255 255 255 / 88%);
    border: 1px solid #e4e7ed;
    box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
  }

  @media (width <= 900px) {
    .editor-page-header :deep(.el-card__body),
    .asset-panel-header {
      flex-direction: column;
      align-items: stretch;
    }

    .editor-actions {
      justify-content: flex-end;
    }

    .gallery-editor-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (900px < width <= 1400px) {
    .gallery-editor-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
