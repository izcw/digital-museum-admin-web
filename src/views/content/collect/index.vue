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
          <ElSelect
            v-model="sortMode"
            aria-label="藏品排序"
            :disabled="sorting || collectionDragging"
          >
            <ElOption label="自定义排序" value="custom" />
            <ElOption label="更新排序" value="updated" />
            <ElOption label="上传排序" value="created" />
          </ElSelect>
        </div>
      </div>
    </ElCard>

    <div class="result-meta">
      <span>共 {{ filteredCollections.length }} 件藏品</span>
      <small>{{
        sortMode === 'custom'
          ? '拖动卡片右下角的拖拽柄保存顺序；藏宝优先'
          : '仅调整后台查看顺序，不改变客户端排序；切回自定义排序后可拖拽'
      }}</small>
      <ElButton text :disabled="sorting || collectionDragging" @click="loadCollections"
        ><ArtSvgIcon icon="ri:refresh-line" />刷新</ElButton
      >
    </div>

    <VueDraggable
      v-if="filteredCollections.length"
      v-model="displayCollections"
      target=".collection-grid"
      :class="{ 'is-sorting': collectionDragging }"
      :disabled="sortMode !== 'custom' || sorting || loading"
      handle=".collection-drag-handle"
      ghost-class="collection-drag-placeholder"
      chosen-class="collection-drag-chosen"
      drag-class="collection-dragging"
      fallback-class="collection-drag-fallback"
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
      :on-move="canMoveCollection"
      @start="startCollectionDrag"
      @end="endCollectionDrag"
      @unchoose="endCollectionDrag"
    >
      <TransitionGroup name="collection-order" tag="div" class="collection-grid">
        <ElCard
          v-for="item in displayCollections"
          :key="item.id"
          class="collection-card"
          :data-collection-id="item.id"
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
            <ElTag
              v-if="item.treasured"
              style="position: absolute; bottom: 12px; left: 12px"
              type="warning"
              >藏宝 · 自动下载</ElTag
            >
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
                      {{ item.published ? '下架藏品' : '发布藏品' }}
                    </ElDropdownItem>
                    <ElDropdownItem command="treasure">{{
                      item.treasured ? '取消藏宝' : '设为藏宝'
                    }}</ElDropdownItem>
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
              ><ElTag v-if="item.printable" type="success" size="small"
                ><ArtSvgIcon icon="ri:printer-line" />可打印</ElTag
              ><span>{{ item.level }}</span>
              <button
                class="collection-drag-handle"
                type="button"
                :disabled="sortMode !== 'custom' || sorting"
                :aria-label="`拖拽调整${item.title}顺序`"
                :title="sortMode === 'custom' ? '拖拽调整顺序' : '切换到自定义排序后可拖拽'"
                @click.stop
                ><ArtSvgIcon icon="ri:drag-move-2-line"
              /></button>
            </div>
          </div>
        </ElCard>
      </TransitionGroup>
    </VueDraggable>
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
            ><h3>3D 打印</h3
            ><ElTag :type="activeCollection.printable ? 'success' : 'info'">{{
              activeCollection.printable ? '可打印' : '未配置打印文件'
            }}</ElTag></div
          >
          <div v-if="activeCollection.printable" class="model-preview">
            <ArtSvgIcon icon="ri:printer-line" />
            <div
              ><strong>{{ activeCollection.gcodeName }}</strong
              ><p>G-code 打印文件</p></div
            >
            <ElLink
              v-if="activeCollection.gcodeUrl"
              :href="activeCollection.gcodeUrl"
              target="_blank"
              type="primary"
              >下载打印文件</ElLink
            >
          </div>
          <ElEmpty v-else description="上传 G-code 文件后，该藏品将显示可打印" :image-size="64" />
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
  import { VueDraggable } from 'vue-draggable-plus'
  import { mergeCollectionOrder } from './collection-order'
  import { ElMessage, ElMessageBox, type UploadFile } from 'element-plus'
  import ArtMenuRight, {
    type MenuItemType
  } from '@/components/core/others/art-menu-right/index.vue'
  import {
    deleteCollectionRequest,
    fetchCollections,
    importCollectionPackage,
    updateCollection,
    reorderCollections
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
  const sortMode = ref<'custom' | 'updated' | 'created'>('custom')
  const collectionDragging = ref(false)
  const sorting = ref(false)
  function startCollectionDrag() {
    collectionDragging.value = true
    document.body.classList.add('collection-list-dragging')
  }
  function endCollectionDrag() {
    collectionDragging.value = false
    document.body.classList.remove('collection-list-dragging')
  }
  function canMoveCollection(event: { dragged: HTMLElement; related: HTMLElement }) {
    const from = collections.value.find((item) => item.id === event.dragged.dataset.collectionId)
    const to = collections.value.find((item) => item.id === event.related.dataset.collectionId)
    // 藏宝固定优先；分组内可排序，不让跨分组拖拽保存后又跳回。
    return !from || !to || Boolean(from.treasured) === Boolean(to.treasured)
  }
  async function saveCollectionOrder(next: CollectionItem[]) {
    if (sorting.value || sortMode.value !== 'custom') return
    const previous = [...collections.value]
    let ordered: CollectionItem[]
    try {
      ordered = mergeCollectionOrder(previous, filteredCollections.value, next)
    } catch {
      ElMessage.warning('列表已变化，请刷新后重新排序')
      return
    }
    const ids = ordered.map((item) => item.id)
    if (ids.every((id, index) => id === previous[index].id)) return
    collections.value = ordered
    sorting.value = true
    try {
      collections.value = await reorderCollections(ids)
      ElMessage.success('排序已保存')
    } catch (error) {
      collections.value = previous
      ElMessage.error(error instanceof Error ? error.message : '排序保存失败')
    } finally {
      sorting.value = false
    }
  }
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
    return collections.value
      .filter((item) => {
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
      .sort((a, b) =>
        sortMode.value === 'custom'
          ? 0
          : String(sortMode.value === 'updated' ? b.updatedAt : b.createdAt).localeCompare(
              String(sortMode.value === 'updated' ? a.updatedAt : a.createdAt)
            )
      )
  })
  const displayCollections = computed({
    get: () => filteredCollections.value,
    set: (next: CollectionItem[]) => {
      void saveCollectionOrder(next)
    }
  })

  const collectionMenuItems = computed<MenuItemType[]>(() => {
    const item = collections.value.find((entry) => entry.id === contextCollectionId.value)
    return [
      { key: 'detail', label: '查看详情', icon: 'ri:eye-line' },
      { key: 'edit', label: '编辑资料', icon: 'ri:edit-line' },
      {
        key: item?.published ? 'unpublish' : 'publish',
        label: item?.published ? '下架藏品' : '发布藏品',
        icon: 'ri:send-plane-line'
      },
      { key: 'treasure', label: item?.treasured ? '取消藏宝' : '设为藏宝', icon: 'ri:star-line' },
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
          `下架后，客户端即使已下载也不能展示“${item.title}”。确定继续吗？`,
          '下架藏品',
          { type: 'warning' }
        )
      } catch {
        return
      }
    }
    const updated = await updateCollection(item.id, { published })
    Object.assign(item, updated)
    await loadCollections()
    publishStatusTab.value = published ? 'published' : 'unpublished'
    ElMessage.success(published ? '藏品已发布' : '藏品已下架')
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
    if (command === 'treasure')
      void updateCollection(item.id, { treasured: !item.treasured })
        .then(loadCollections)
        .catch((error) => ElMessage.error(error.message))
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
  onBeforeUnmount(endCollectionDrag)
  onDeactivated(endCollectionDrag)
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
    grid-template-columns: minmax(210px, 1.5fr) repeat(4, minmax(130px, 1fr));
    gap: 10px;
    width: min(980px, 64vw);
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

  .collection-drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 18px;
    color: var(--art-text-gray-600);
    touch-action: none;
    cursor: grab;
    background: transparent;
    border: 0;
    border-radius: 6px;

    &:hover:not(:disabled) {
      color: var(--main-color);
      background: var(--el-color-primary-light-9);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.35;
    }

    &:focus-visible {
      outline: 2px solid var(--main-color);
      outline-offset: 2px;
    }
  }

  .collection-drag-placeholder {
    position: relative;
    background: var(--el-color-primary-light-9);
    outline: 2px dashed var(--main-color);
    outline-offset: -2px;
    box-shadow: none;
    opacity: 1;
    animation: collection-placeholder-pulse 1.1s ease-in-out infinite;

    :deep(.el-card__body) {
      visibility: hidden;
    }

    &::after {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 14px;
      color: var(--main-color);
      content: '释放到此处';
    }
  }

  .collection-drag-chosen {
    box-shadow: 0 10px 26px rgb(0 0 0 / 14%);
  }

  .collection-dragging {
    cursor: grabbing;
    opacity: 0.88;
  }

  :global(.collection-drag-fallback) {
    z-index: 9999 !important;
    pointer-events: none !important;
    box-shadow: 0 16px 34px rgb(0 0 0 / 20%);
    opacity: 0.94 !important;
    // ElCard 默认过渡所有属性，不能让鼠标位移也产生 0.3s 的追赶延迟。
    transition: none !important;
    animation: none !important;
  }

  .collection-order-move {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(body.collection-list-dragging) {
    cursor: grabbing !important;
    user-select: none;
  }

  @keyframes collection-placeholder-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgb(64 158 255 / 0%);
    }

    50% {
      box-shadow: 0 0 0 5px rgb(64 158 255 / 15%);
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
