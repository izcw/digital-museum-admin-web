<template>
  <div class="collection-page art-full-height" v-loading="loading">
    <ElCard class="collection-toolbar" shadow="never">
      <div class="toolbar-main">
        <div>
          <h2>藏品管理</h2>
          <p>统一维护藏品资料、展示图片与三维模型</p>
        </div>
        <div class="toolbar-actions">
          <ElButton @click="importVisible = true">
            <ArtSvgIcon icon="ri:upload-cloud-2-line" />导入资料包
          </ElButton>
          <ElButton type="primary" @click="openEditor()">
            <ArtSvgIcon icon="ri:add-line" />新增藏品
          </ElButton>
        </div>
      </div>

      <ElTabs v-model="publishStatusTab" class="status-tabs">
        <ElTabPane name="unpublished">
          <template #label
            >未发布 <span class="tab-count">{{ unpublishedCount }}</span></template
          >
        </ElTabPane>
        <ElTabPane name="published">
          <template #label
            >已发布 <span class="tab-count">{{ publishedCount }}</span></template
          >
        </ElTabPane>
      </ElTabs>

      <div class="filter-row">
        <div class="category-tabs" role="tablist" aria-label="藏品分类">
          <button
            v-for="category in categories"
            :key="category"
            :class="{ active: activeCategory === category }"
            type="button"
            @click="activeCategory = category"
          >
            {{ category }} <span>{{ categoryCount(category) }}</span>
          </button>
        </div>
        <div class="filters">
          <ElInput v-model="keyword" clearable placeholder="搜索名称、编号、材质或描述">
            <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
          </ElInput>
          <ElSelect v-model="periodFilter" clearable placeholder="全部年代">
            <ElOption
              v-for="period in availablePeriods"
              :key="period"
              :label="period"
              :value="period"
            />
          </ElSelect>
          <ElSelect v-model="museumFilter" clearable placeholder="全部单位">
            <ElOption
              v-for="museum in availableMuseums"
              :key="museum"
              :label="museum"
              :value="museum"
            />
          </ElSelect>
          <ElSelect v-model="modelFilter" placeholder="全部资源">
            <ElOption label="全部资源" value="all" />
            <ElOption label="包含 3D" value="3d" />
            <ElOption label="仅图片" value="image" />
          </ElSelect>
        </div>
      </div>
    </ElCard>

    <div class="result-meta">
      <span>共 {{ filteredCollections.length }} 件藏品</span>
      <ElButton text @click="loadCollections"><ArtSvgIcon icon="ri:refresh-line" />刷新</ElButton>
    </div>

    <div v-if="filteredCollections.length" class="collection-grid">
      <ElCard
        v-for="item in filteredCollections"
        :key="item.id"
        class="collection-card"
        shadow="hover"
        @contextmenu.prevent="showContextMenu($event, item)"
      >
        <div
          class="cover-wrap"
          role="button"
          tabindex="0"
          :aria-label="`查看${item.title}详情`"
          @click="openDetail(item)"
          @keydown.enter="openDetail(item)"
          @keydown.space.prevent="openDetail(item)"
        >
          <ElImage :src="item.cover" fit="contain" class="collection-cover" lazy>
            <template #error
              ><div class="image-state"><ArtSvgIcon icon="ri:image-line" /></div
            ></template>
          </ElImage>
          <span class="category-badge">{{ item.category }}</span>
          <span v-if="item.hasModel" class="model-badge" title="包含 3D 模型">
            <ArtSvgIcon icon="ri:box-3-line" />
          </span>
        </div>
        <div class="card-content">
          <div class="title-row">
            <h3 :title="item.title">{{ item.title }}</h3>
            <ElDropdown
              trigger="click"
              @command="(command: string) => handleCommand(command, item)"
              @click.stop
            >
              <ElButton text circle aria-label="藏品操作"
                ><ArtSvgIcon icon="ri:more-2-fill"
              /></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="detail">查看详情</ElDropdownItem>
                  <ElDropdownItem command="edit">编辑资料</ElDropdownItem>
                  <ElDropdownItem :command="item.published ? 'unpublish' : 'publish'">
                    {{ item.published ? '取消发布' : '发布藏品' }}
                  </ElDropdownItem>
                  <ElDropdownItem divided command="delete"
                    ><span class="danger-action">删除</span></ElDropdownItem
                  >
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
          <div class="metadata">
            <span><ArtSvgIcon icon="ri:time-line" />{{ item.period || '年代未填写' }}</span>
            <span><ArtSvgIcon icon="ri:government-line" />{{ item.museum || '单位未填写' }}</span>
          </div>
          <p class="description" :title="plainDescription(item.description)">
            {{ plainDescription(item.description) }}
          </p>
          <div class="card-footer"
            ><span>{{ item.material }}</span
            ><span>{{ item.level }}</span></div
          >
        </div>
      </ElCard>
    </div>
    <ElEmpty v-else-if="!loading" description="没有找到符合条件的藏品">
      <ElButton v-if="collections.length" type="primary" @click="resetFilters">清除筛选</ElButton>
      <ElButton v-else type="primary" @click="importVisible = true">导入第一件藏品</ElButton>
    </ElEmpty>

    <ElDrawer
      v-model="detailVisible"
      :title="activeCollection?.title || '藏品详情'"
      size="min(980px, 96vw)"
      class="collection-detail-drawer"
    >
      <template v-if="activeCollection">
        <ElTag :type="activeCollection.published ? 'success' : 'info'">
          {{ activeCollection.published ? '已发布 · 客户端可见' : '未发布 · 客户端不可见' }}
        </ElTag>

        <section class="detail-block">
          <div class="detail-title"
            ><h3>3D 资源</h3><span>{{ activeCollection.modelName || '暂无模型' }}</span></div
          >
          <div v-if="activeCollection.hasModel" class="model-preview">
            <ArtSvgIcon icon="ri:box-3-line" />
            <div
              ><strong>{{ activeCollection.modelName }}</strong
              ><p>GLB 三维模型</p></div
            >
            <ElLink
              v-if="activeCollection.modelUrl"
              :href="activeCollection.modelUrl"
              target="_blank"
              type="primary"
              >打开资源</ElLink
            >
          </div>
          <ElEmpty v-else description="该藏品暂未配置 3D 模型" :image-size="64" />
        </section>

        <section class="detail-block">
          <div class="detail-title"
            ><h3>藏品图集</h3><span>共 {{ activeCollection.gallery.length }} 张</span></div
          >
          <div class="detail-gallery">
            <div
              v-for="(image, index) in activeCollection.gallery"
              :key="image"
              class="gallery-item"
            >
              <ElImage
                :src="image"
                :preview-src-list="activeCollection.gallery"
                :initial-index="index"
                fit="contain"
                preview-teleported
                @show="setImagePreviewBackground(true)"
                @close="setImagePreviewBackground(false)"
              />
              <span>{{ index + 1 }}/{{ activeCollection.gallery.length }}</span>
            </div>
          </div>
        </section>

        <section class="detail-block">
          <div class="detail-title"><h3>藏品参数</h3><span>来源于藏品资料</span></div>
          <ElDescriptions class="collection-parameters" :column="2" label-width="120px" border>
            <ElDescriptionsItem label="藏品编号">{{ activeCollection.id }}</ElDescriptionsItem>
            <ElDescriptionsItem label="文物级别">{{
              activeCollection.level || '未填写'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="年代">{{
              activeCollection.period || '未填写'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="分类">{{ activeCollection.category }}</ElDescriptionsItem>
            <ElDescriptionsItem label="材质">{{
              activeCollection.material || '未填写'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="馆藏单位">{{
              activeCollection.museum || '未填写'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="尺寸" :span="2">{{
              activeCollection.dimensions || '未填写'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="文物介绍" :span="2">
              <div
                class="markdown-preview"
                v-html="renderMarkdown(activeCollection.description)"
                @click="openMarkdownImage"
              ></div>
            </ElDescriptionsItem>
          </ElDescriptions>
        </section>
      </template>
      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="activeCollection && openEditor(activeCollection)"
          >编辑资料</ElButton
        >
      </template>
    </ElDrawer>

    <ElDialog
      v-model="importVisible"
      title="导入藏品资料包"
      width="min(560px, 92vw)"
      align-center
      :close-on-click-modal="false"
      @closed="resetPackageImport"
    >
      <ElUpload
        :key="importUploadKey"
        drag
        accept=".zip"
        :auto-upload="false"
        :limit="1"
        :show-file-list="false"
        :on-change="handlePackageChange"
      >
        <ArtSvgIcon icon="ri:folder-zip-line" class="upload-icon" />
        <div class="el-upload__text">将 DMC 资源包拖到此处，或 <em>点击选择</em></div>
        <template #tip>
          <p class="upload-tip"
            >仅支持以 {{ COLLECTION_PACKAGE_PREFIX }} 开头的
            {{ COLLECTION_PACKAGE_SCHEMA_VERSION }} 版资源包。</p
          >
        </template>
      </ElUpload>
      <ElAlert
        v-if="selectedPackage"
        :title="selectedPackage.name"
        description="后端将校验清单并安全解压；导入后默认为未发布。"
        type="success"
        :closable="false"
        show-icon
      />
      <template #footer>
        <ElButton @click="importVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="packageImporting"
          :disabled="!selectedPackage"
          @click="confirmImport"
        >
          开始导入
        </ElButton>
      </template>
    </ElDialog>

    <Teleport to="body">
      <ElImageViewer
        v-if="markdownPreviewVisible"
        :url-list="markdownPreviewImages"
        :initial-index="markdownPreviewIndex"
        hide-on-click-modal
        @close="closeMarkdownPreview"
      />
      <ArtMenuRight
        ref="collectionMenuRef"
        :menu-items="collectionMenuItems"
        :menu-width="180"
        :border-radius="10"
        @select="handleCollectionMenuSelect"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, type UploadFile } from 'element-plus'
  import ArtMenuRight, {
    type MenuItemType
  } from '@/components/core/others/art-menu-right/index.vue'
  import {
    deleteCollectionRequest,
    fetchCollections,
    importCollectionPackage,
    updateCollection
  } from '@/api/collections'
  import { categories, collections, periodOptions, type CollectionItem } from './collection-data'
  import {
    COLLECTION_PACKAGE_PREFIX,
    COLLECTION_PACKAGE_SCHEMA_VERSION
  } from './collection-package'

  defineOptions({ name: 'Collect' })

  const route = useRoute()
  const router = useRouter()
  const loading = ref(false)
  const loaded = ref(false)
  const activeCategory = ref<(typeof categories)[number]>('全部')
  const publishStatusTab = ref<'published' | 'unpublished'>('published')
  const keyword = ref('')
  const periodFilter = ref('')
  const museumFilter = ref('')
  const modelFilter = ref<'all' | '3d' | 'image'>('all')
  const detailVisible = ref(false)
  const activeCollection = ref<CollectionItem>()
  const importVisible = ref(false)
  const importUploadKey = ref(0)
  const selectedPackage = ref<File>()
  const packageImporting = ref(false)
  const markdownPreviewVisible = ref(false)
  const markdownPreviewImages = ref<string[]>([])
  const markdownPreviewIndex = ref(0)
  const collectionMenuRef = ref<InstanceType<typeof ArtMenuRight>>()
  const contextCollectionId = ref('')

  const publishedCount = computed(() => collections.value.filter((item) => item.published).length)
  const unpublishedCount = computed(() => collections.value.length - publishedCount.value)
  const availablePeriods = computed(() => {
    const defaults = periodOptions.map((item) => item.value)
    return [
      ...new Set([...defaults, ...collections.value.map((item) => item.period).filter(Boolean)])
    ]
  })
  const availableMuseums = computed(() => [
    ...new Set(collections.value.map((item) => item.museum).filter(Boolean))
  ])
  const filteredCollections = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    return collections.value.filter((item) => {
      const haystack = [
        item.id,
        item.title,
        item.period,
        item.museum,
        item.material,
        item.description
      ]
      return (
        item.published === (publishStatusTab.value === 'published') &&
        (activeCategory.value === '全部' || item.category === activeCategory.value) &&
        (!periodFilter.value || item.period === periodFilter.value) &&
        (!museumFilter.value || item.museum === museumFilter.value) &&
        (modelFilter.value === 'all' ||
          (modelFilter.value === '3d' ? item.hasModel : !item.hasModel)) &&
        (!query || haystack.some((value) => value.toLowerCase().includes(query)))
      )
    })
  })

  const collectionMenuItems = computed<MenuItemType[]>(() => {
    const item = collections.value.find((entry) => entry.id === contextCollectionId.value)
    return [
      { key: 'detail', label: '查看详情', icon: 'ri:eye-line' },
      { key: 'edit', label: '编辑资料', icon: 'ri:edit-line' },
      {
        key: item?.published ? 'unpublish' : 'publish',
        label: item?.published ? '取消发布' : '发布藏品',
        icon: 'ri:send-plane-line'
      },
      { key: 'delete', label: '删除藏品', icon: 'ri:delete-bin-line', showLine: true }
    ]
  })

  async function loadCollections() {
    loading.value = true
    try {
      collections.value = await fetchCollections()
      loaded.value = true
      if (activeCollection.value)
        activeCollection.value = collections.value.find(
          (item) => item.id === activeCollection.value?.id
        )
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '藏品加载失败')
    } finally {
      loading.value = false
    }
  }

  function categoryCount(category: (typeof categories)[number]) {
    const records = collections.value.filter(
      (item) => item.published === (publishStatusTab.value === 'published')
    )
    return category === '全部'
      ? records.length
      : records.filter((item) => item.category === category).length
  }

  function resetFilters() {
    activeCategory.value = '全部'
    keyword.value = ''
    periodFilter.value = ''
    museumFilter.value = ''
    modelFilter.value = 'all'
  }

  function openDetail(item: CollectionItem) {
    activeCollection.value = item
    detailVisible.value = true
  }

  function openEditor(item?: CollectionItem) {
    detailVisible.value = false
    void router.push({ name: 'CollectEditor', params: item ? { id: item.id } : {} })
  }

  async function setPublished(item: CollectionItem, published: boolean) {
    if (!published) {
      try {
        await ElMessageBox.confirm(
          `取消发布后，客户端将不再加载“${item.title}”。确定继续吗？`,
          '取消发布',
          { type: 'warning' }
        )
      } catch {
        return
      }
    }
    const updated = await updateCollection(item.id, { published })
    Object.assign(item, updated)
    publishStatusTab.value = published ? 'published' : 'unpublished'
    ElMessage.success(published ? '藏品已发布' : '已取消发布')
  }

  async function removeCollection(item: CollectionItem) {
    try {
      await ElMessageBox.confirm(`确定删除“${item.title}”及其全部资源吗？`, '删除藏品', {
        type: 'warning'
      })
      await deleteCollectionRequest(item.id)
      collections.value = collections.value.filter((entry) => entry.id !== item.id)
      detailVisible.value = false
      ElMessage.success('藏品已删除')
    } catch (error) {
      if (error instanceof Error) ElMessage.error(error.message || '藏品删除失败')
    }
  }

  function handleCommand(command: string, item: CollectionItem) {
    if (command === 'detail') openDetail(item)
    if (command === 'edit') openEditor(item)
    if (command === 'publish') void setPublished(item, true)
    if (command === 'unpublish') void setPublished(item, false)
    if (command === 'delete') void removeCollection(item)
  }

  function showContextMenu(event: MouseEvent, item: CollectionItem) {
    contextCollectionId.value = item.id
    collectionMenuRef.value?.show(event)
  }

  function handleCollectionMenuSelect(menu: MenuItemType) {
    const item = collections.value.find((entry) => entry.id === contextCollectionId.value)
    if (item) handleCommand(menu.key, item)
  }

  function handlePackageChange(upload: UploadFile) {
    const file = upload.raw
    selectedPackage.value = undefined
    if (!file) return
    if (
      !file.name.startsWith(COLLECTION_PACKAGE_PREFIX) ||
      !file.name.toLowerCase().endsWith('.zip')
    ) {
      importUploadKey.value += 1
      ElMessage.error(`请上传以 ${COLLECTION_PACKAGE_PREFIX} 开头的 ZIP 资源包`)
      return
    }
    selectedPackage.value = file
  }

  function resetPackageImport() {
    selectedPackage.value = undefined
    packageImporting.value = false
    importUploadKey.value += 1
  }

  async function confirmImport() {
    if (!selectedPackage.value) return
    packageImporting.value = true
    try {
      const imported = await importCollectionPackage(selectedPackage.value)
      const index = collections.value.findIndex((item) => item.id === imported.id)
      if (index >= 0) collections.value.splice(index, 1, imported)
      else collections.value.unshift(imported)
      importVisible.value = false
      ElMessage.success('资源包已导入，正在打开编辑页面')
      await router.push({
        name: 'CollectEditor',
        params: { id: imported.id },
        query: { imported: '1' }
      })
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '资源包导入失败')
    } finally {
      packageImporting.value = false
    }
  }

  function plainDescription(markdown: string) {
    return markdown
      .replace(/!\[.*?\]\([^)]*\)/g, '')
      .replace(/[#*_`>]/g, '')
      .replaceAll('[', '')
      .replaceAll(']', '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function renderMarkdown(markdown: string) {
    const escaped = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    return escaped
      .replace(
        /!\[([^\]]*)\]\((?:&lt;)?([^\s)]+?)(?:&gt;)?\)/g,
        '<img src="$2" alt="$1" loading="lazy">'
      )
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .split(/\n{2,}/)
      .map((block) =>
        /^<(?:h\d|img|ul|ol|li)/.test(block) ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`
      )
      .join('')
  }

  function openMarkdownImage(event: MouseEvent) {
    if (
      !(event.target instanceof HTMLImageElement) ||
      !(event.currentTarget instanceof HTMLElement)
    )
      return
    const images = Array.from(event.currentTarget.querySelectorAll<HTMLImageElement>('img')).map(
      (image) => image.currentSrc || image.src
    )
    markdownPreviewImages.value = images
    markdownPreviewIndex.value = Math.max(
      0,
      images.indexOf(event.target.currentSrc || event.target.src)
    )
    markdownPreviewVisible.value = true
    setImagePreviewBackground(true)
  }

  function closeMarkdownPreview() {
    markdownPreviewVisible.value = false
    setImagePreviewBackground(false)
  }

  function setImagePreviewBackground(visible: boolean) {
    document.body.classList.toggle('collection-image-preview', visible)
  }

  watch(
    () => route.query.status,
    (status) => {
      if (status === 'published' || status === 'unpublished') publishStatusTab.value = status
    },
    { immediate: true }
  )
  onMounted(loadCollections)
  onActivated(() => {
    if (loaded.value) void loadCollections()
  })
  onBeforeUnmount(() => document.body.classList.remove('collection-image-preview'))
</script>

<style scoped lang="scss">
  .collection-page {
    padding-bottom: 24px;
  }

  .collection-toolbar {
    border: 0;

    :deep(.el-card__body) {
      padding: 24px;
    }
  }

  .toolbar-main,
  .filter-row,
  .result-meta,
  .title-row,
  .card-footer,
  .detail-title,
  .model-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .toolbar-main h2 {
    margin: 0;
    font-size: 22px;
  }

  .toolbar-main p {
    margin: 5px 0 0;
    color: var(--el-text-color-secondary);
  }

  .toolbar-actions {
    display: flex;
    gap: 10px;
  }

  .status-tabs {
    margin-top: 22px;

    .tab-count {
      margin-left: 5px;
      color: var(--el-text-color-secondary);
    }

    :deep(.el-tabs__header) {
      margin-bottom: 16px;
    }
  }

  .filter-row {
    gap: 20px;
    align-items: flex-start;
  }

  .category-tabs {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 8px;

    button {
      padding: 8px 12px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: var(--el-fill-color-light);
      border: 0;
      border-radius: 8px;

      span {
        margin-left: 3px;
        opacity: 0.65;
      }

      &.active {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
    }
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(210px, 1.5fr) repeat(3, minmax(130px, 1fr));
    gap: 10px;
    width: min(760px, 58vw);
  }

  .result-meta {
    padding: 18px 4px 12px;
    color: var(--el-text-color-secondary);
  }

  .collection-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
  }

  .collection-card {
    overflow: hidden;
    border: 0;

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .cover-wrap {
    position: relative;
    height: 210px;
    cursor: pointer;
    background: var(--el-fill-color-lighter);
  }

  .collection-cover {
    width: 100%;
    height: 100%;
  }

  .image-state {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    font-size: 36px;
    color: var(--el-text-color-placeholder);
  }

  .category-badge,
  .model-badge {
    position: absolute;
    top: 12px;
    color: #fff;
    background: rgb(0 0 0 / 58%);
    backdrop-filter: blur(6px);
    border-radius: 18px;
  }

  .category-badge {
    left: 12px;
    padding: 4px 10px;
    font-size: 12px;
  }

  .model-badge {
    right: 12px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
  }

  .card-content {
    min-width: 0;
    padding: 15px;
  }

  .title-row {
    gap: 8px;
  }

  .title-row h3 {
    margin: 0;
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metadata {
    display: grid;
    gap: 6px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    span {
      display: flex;
      gap: 5px;
      align-items: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .description {
    margin: 12px 0;
    overflow: hidden;
    font-size: 13px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-footer {
    padding-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .danger-action {
    color: var(--el-color-danger);
  }

  .detail-block {
    padding: 22px;
    margin-top: 24px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
  }

  .detail-title {
    margin-bottom: 16px;
  }

  .detail-title h3 {
    margin: 0;
  }

  .detail-title span {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .model-preview {
    gap: 16px;
    justify-content: flex-start;
    padding: 24px;
    background: linear-gradient(
      135deg,
      var(--el-color-primary-light-9),
      var(--el-fill-color-light)
    );
    border-radius: 12px;

    > svg {
      font-size: 42px;
      color: var(--el-color-primary);
    }

    div {
      flex: 1;
    }

    p {
      margin: 4px 0 0;
      color: var(--el-text-color-secondary);
    }
  }

  .detail-gallery {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .gallery-item {
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;

    .el-image {
      width: 100%;
      aspect-ratio: 1;
    }

    span {
      display: block;
      padding: 7px 10px;
      font-size: 12px;
      text-align: right;
    }
  }

  .markdown-preview {
    line-height: 1.85;

    :deep(img) {
      display: block;
      max-width: 100%;
      max-height: 520px;
      margin: 14px auto;
      cursor: zoom-in;
      object-fit: contain;
      border-radius: 8px;
    }

    :deep(p) {
      margin: 0 0 12px;
    }
  }

  .collection-parameters {
    :deep(.el-descriptions__label) {
      width: 120px;
      min-width: 120px;
      white-space: nowrap;
    }

    :deep(.el-descriptions__content) {
      min-width: 0;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
  }

  .upload-icon {
    margin-bottom: 12px;
    font-size: 46px;
    color: var(--el-text-color-secondary);
  }

  .upload-tip {
    color: var(--el-text-color-secondary);
    text-align: center;
  }

  .el-alert {
    margin-top: 18px;
  }

  @media (width <= 1800px) {
    .collection-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  @media (width <= 1500px) {
    .collection-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .filter-row {
      flex-direction: column;
    }

    .filters {
      width: 100%;
    }
  }

  @media (width <= 1100px) {
    .collection-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .detail-gallery {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width <= 760px) {
    .toolbar-main {
      flex-direction: column;
      align-items: flex-start;
    }

    .filters {
      grid-template-columns: 1fr;
    }

    .collection-grid {
      grid-template-columns: 1fr;
    }

    .detail-gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>

<style lang="scss">
  body.collection-image-preview .el-image-viewer__mask {
    background: #fff !important;
    opacity: 1 !important;
  }
</style>
