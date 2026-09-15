<template>
  <div class="art-full-height">
    <template v-if="kind !== 'knowledge' || !detailRow">
      <ElRow :gutter="16" class="summary-row">
        <ElCol v-for="card in summary" :key="card.label" :xs="12" :sm="6">
          <ElCard shadow="never" class="summary-card">
            <ArtSvgIcon :icon="card.icon" class="summary-icon" />
            <div
              ><strong>{{ card.value }}</strong
              ><span>{{ card.label }}</span></div
            >
          </ElCard>
        </ElCol>
      </ElRow>
      <ArtSearchBar
        v-model="search"
        :items="searchItems"
        @search="applySearch"
        @reset="resetSearch"
      />
      <ElCard class="art-table-card">
        <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refresh">
          <template #left>
            <ElButton type="primary" v-ripple @click="openEditor()">{{ labels.add }}</ElButton>
          </template>
        </ArtTableHeader>
        <ArtTable
          :loading="loading"
          :data="pageRows"
          :columns="columns"
          :pagination="pagination"
          :empty-text="hasSearch ? '没有匹配结果，请调整筛选条件' : labels.empty"
          @pagination:size-change="changeSize"
          @pagination:current-change="changePage"
        />
      </ElCard>
    </template>

    <ElDialog
      v-model="editorVisible"
      :title="editingId ? labels.edit : labels.add"
      width="min(1000px, 94vw)"
      align-center
      :close-on-click-modal="false"
      :before-close="closeConfigEditor"
    >
      <ElAlert :title="labels.tip" type="info" :closable="false" show-icon class="editor-tip" />
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="104px">
        <ElFormItem :label="nameLabel" prop="name"
          ><ElInput v-model="form.name" maxlength="60"
        /></ElFormItem>
        <template v-if="kind === 'knowledge'">
          <ElFormItem label="主题分类"
            ><ElSelect v-model="form.theme" filterable allow-create default-first-option
              ><ElOption
                v-for="v in ['古代中国', '青铜文明', '瓷器艺术']"
                :key="v"
                :value="v"
                :label="v" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="知识库说明"
            ><ElInput v-model="form.description" type="textarea" :rows="3"
          /></ElFormItem>
          <ElCollapse
            ><ElCollapseItem title="处理设置（高级）" name="processing">
              <ElFormItem label="向量模型"
                ><ElSelect v-model="form.embeddingId"
                  ><ElOption
                    v-for="m in aiState.models.filter((m) => m.purpose === 'embedding')"
                    :key="m.id"
                    :value="m.id"
                    :label="m.name"
                    :disabled="m.status === 'disabled'" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="分段字符数"
                ><ElInputNumber v-model="form.chunkSize" :min="100" :max="4000" :step="100"
              /></ElFormItem>
              <ElFormItem label="重叠字符数"
                ><ElInputNumber
                  v-model="form.overlap"
                  :min="0"
                  :max="Math.max(0, form.chunkSize - 1)"
                  :step="20"
              /></ElFormItem> </ElCollapseItem
          ></ElCollapse>
        </template>
        <template v-else-if="kind === 'prompt'">
          <ElRow :gutter="16"
            ><ElCol :span="12"
              ><ElFormItem label="应用场景" prop="scene"
                ><ElSelect v-model="form.scene" class="!w-full"
                  ><ElOption
                    v-for="v in ['知识问答', '文物讲解', '安全审核']"
                    :key="v"
                    :label="v"
                    :value="v" /></ElSelect></ElFormItem></ElCol
            ><ElCol :span="12"
              ><ElFormItem label="版本号" prop="version"
                ><ElTag>{{
                  form.publishedVersion ? `当前发布 V${form.publishedVersion}` : '未发布'
                }}</ElTag></ElFormItem
              ></ElCol
            ></ElRow
          >
          <ElFormItem label="模板内容" prop="content"
            ><ElInput
              v-model="form.content"
              type="textarea"
              :rows="9"
              maxlength="4000"
              show-word-limit
              placeholder="可使用双花括号变量，例如 question、context"
          /></ElFormItem>
          <ElFormItem label="插入变量"
            ><ElButton
              v-for="name in ['question', 'context', 'ageGroup', 'artifact', 'answer']"
              :key="name"
              size="small"
              @click="form.content = (form.content || '') + ' {{' + name + '}}'"
              >{{ name }}</ElButton
            ></ElFormItem
          >
          <ElFormItem label="变量定义"
            ><ElTable :data="form.variableDefs || []"
              ><ElTableColumn prop="name" label="变量" width="110" /><ElTableColumn label="说明"
                ><template #default="{ row }"
                  ><ElInput v-model="row.description" /></template></ElTableColumn
              ><ElTableColumn label="必填" width="65"
                ><template #default="{ row }"
                  ><ElSwitch v-model="row.required" /></template></ElTableColumn
              ><ElTableColumn label="默认值"
                ><template #default="{ row }"
                  ><ElInput v-model="row.defaultValue" /></template></ElTableColumn
              ><ElTableColumn label="测试值"
                ><template #default="{ row }"
                  ><ElInput v-model="row.testValue" /></template></ElTableColumn></ElTable
            ><small>自动识别正文中的双花括号变量。</small></ElFormItem
          >
        </template>
        <template v-else-if="kind === 'script'">
          <ElFormItem label="触发事件" required
            ><ElSelect
              v-model="form.event"
              @change="form.category = scriptEvents.find((e) => e.key === form.event)?.category"
              ><ElOption
                v-for="e in scriptEvents"
                :key="e.key"
                :value="e.key"
                :label="e.label" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="适用范围"
            ><ElRadioGroup v-model="form.scope"
              ><ElRadioButton value="global">全局默认</ElRadioButton
              ><ElRadioButton value="digital">指定数字人</ElRadioButton></ElRadioGroup
            ></ElFormItem
          >
          <ElFormItem v-if="form.scope === 'digital'" label="数字人" required
            ><ElSelect v-model="form.digitalId" filterable
              ><ElOption
                v-for="d in aiState.digital"
                :key="d.id"
                :value="d.id"
                :label="d.name" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="展示文本" prop="content"
            ><ElInput
              v-model="form.content"
              type="textarea"
              :rows="5"
              maxlength="1000"
              show-word-limit
          /></ElFormItem>
          <ElFormItem label="播报文本"
            ><ElInput
              v-model="form.spokenContent"
              type="textarea"
              :rows="2"
              placeholder="留空沿用展示文本"
          /></ElFormItem>
          <ElFormItem label="后续动作"
            ><ElSelect v-model="form.action"
              ><ElOption label="无" value="none" /><ElOption label="重试" value="retry" /><ElOption
                label="推荐问题"
                value="recommend" /><ElOption label="返回首页" value="home" /></ElSelect
          ></ElFormItem>
        </template>
        <template v-else>
          <ElFormItem label="形象缩略图">
            <div class="avatar-picker"
              ><ElAvatar :src="form.avatar" shape="square" :size="72" /><ElRadioGroup
                v-model="form.avatar"
                ><ElRadioButton :value="avatar1">形象一</ElRadioButton
                ><ElRadioButton :value="avatar2">形象二</ElRadioButton
                ><ElRadioButton :value="avatar3">形象三</ElRadioButton></ElRadioGroup
              ><ElButton @click="notifyAvatarUpload">上传图片</ElButton></div
            >
          </ElFormItem>
          <ElRow :gutter="16"
            ><ElCol :span="12"
              ><ElFormItem label="角色类型" prop="role"
                ><ElSelect v-model="form.role" class="!w-full"
                  ><ElOption
                    v-for="v in ['博物馆讲解员', '历史人物', '课堂助教']"
                    :key="v"
                    :label="v"
                    :value="v" /></ElSelect></ElFormItem></ElCol
            ><ElCol :span="12"
              ><ElFormItem label="绑定知识库" prop="knowledge"
                ><ElSelect v-model="form.knowledge" class="!w-full"
                  ><ElOption label="古代中国知识库" value="古代中国知识库" /><ElOption
                    label="青铜文明知识库"
                    value="青铜文明知识库" /></ElSelect></ElFormItem></ElCol
          ></ElRow>
          <ElRow :gutter="16"
            ><ElCol :span="12"
              ><ElFormItem label="提示词模板" prop="prompt"
                ><ElSelect v-model="form.prompt" class="!w-full"
                  ><ElOption label="学生问答 V1.2" value="学生问答 V1.2" /><ElOption
                    label="文物讲解 V1.0"
                    value="文物讲解 V1.0" /></ElSelect></ElFormItem></ElCol
            ><ElCol :span="12"
              ><ElFormItem label="欢迎话术"
                ><ElSelect v-model="form.welcome" class="!w-full"
                  ><ElOption label="通用欢迎语" value="通用欢迎语" /><ElOption
                    label="青铜主题欢迎语"
                    value="青铜主题欢迎语" /></ElSelect></ElFormItem></ElCol
          ></ElRow>
          <ElFormItem label="角色说明"
            ><ElInput
              v-model="form.description"
              type="textarea"
              :rows="4"
              maxlength="300"
              show-word-limit
          /></ElFormItem>
        </template>
        <ElFormItem label="启用状态"
          ><ElSwitch v-model="form.status" active-value="enabled" inactive-value="disabled"
        /></ElFormItem>
        <ElFormItem label="备注"
          ><ElInput v-model="form.remark" type="textarea" :rows="2" maxlength="200"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="closeConfigEditor(() => (editorVisible = false))">取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="save">{{
          kind === 'prompt' ? '保存草稿' : '保存'
        }}</ElButton></template
      >
    </ElDialog>

    <component
      :is="kind === 'knowledge' ? 'section' : ElDrawer"
      v-if="kind !== 'knowledge' || detailRow"
      v-model="detailVisible"
      :title="labels.detail"
      size="560px"
      :class="{ 'knowledge-detail-page': kind === 'knowledge' }"
    >
      <template v-if="detailRow">
        <ElCard v-if="kind === 'knowledge'" shadow="never" class="knowledge-content-card">
          <header class="knowledge-heading"
            ><div
              ><h1>{{ detailRow.name }}</h1
              ><p>管理目录、文件预览、解析与向量化状态。</p></div
            ><ElButton @click="closeKnowledgeDetail"
              ><ArtSvgIcon icon="ri:arrow-left-line" />返回知识库</ElButton
            ></header
          >
          <ElTabs v-model="knowledgeTab">
            <ElTabPane label="知识库概览" name="overview">
              <ElDescriptions :column="2" border
                ><ElDescriptionsItem
                  v-for="item in details"
                  :key="item.label"
                  :label="item.label"
                  >{{ item.value || '-' }}</ElDescriptionsItem
                ></ElDescriptions
              >
            </ElTabPane>
            <ElTabPane label="知识资源" name="resources">
              <div
                ref="resourceLayoutRef"
                class="resource-layout"
                :class="{ 'is-resizing': resizingDirectory }"
                :style="{ '--directory-width': `${directoryWidth}px` }"
              >
                <ElCard shadow="never" class="directory-card">
                  <template #header>
                    <div class="directory-header"
                      ><b>资源目录</b
                      ><span>
                        <ElButton
                          link
                          type="primary"
                          @click="setDirectoriesExpanded(!hasExpandedDirectories)"
                          >{{ hasExpandedDirectories ? '收起全部' : '展开全部' }}</ElButton
                        >
                      </span></div
                    >
                  </template>
                  <ElTree
                    ref="directoryTreeRef"
                    :data="resourceTree"
                    node-key="id"
                    :default-expanded-keys="expandedDirectoryIds"
                    :auto-expand-parent="false"
                    highlight-current
                    draggable
                    :allow-drag="allowDirectoryDrag"
                    :allow-drop="allowDirectoryDrop"
                    @node-drop="moveDirectory"
                    @node-drag-start="startTreeDrag"
                    @node-drag-end="endTreeDrag"
                    @node-expand="rememberDirectoryExpansion($event, true)"
                    @node-collapse="rememberDirectoryExpansion($event, false)"
                    :current-node-key="selectedDirectory"
                    @node-click="selectDirectory"
                  >
                    <template #default="{ data, node }">
                      <div
                        class="directory-drop-zone"
                        :class="{
                          'is-drop-target': dropDirectoryId === data.id,
                          'is-drag-source': draggingTreeId === data.id,
                          'is-drop-landed': landedTreeId === data.id
                        }"
                        @dragover="hoverResourceDirectory($event, data)"
                        @dragleave="leaveResourceDirectory($event, data)"
                        @drop="dropResourceToDirectory($event, data)"
                        @dblclick.stop="data.resource && previewResource(data.resource)"
                      >
                        <span class="tree-node"
                          ><span
                            ><ArtSvgIcon
                              :icon="
                                data.resource
                                  ? resourceIcon(data.resource.type)
                                  : dropDirectoryId === data.id || node.expanded
                                    ? 'ri:folder-open-line'
                                    : 'ri:folder-3-line'
                              "
                            />
                            <span class="tree-node-label" :title="data.label">{{
                              data.label
                            }}</span></span
                          ><span
                            v-if="!data.resource"
                            class="directory-node-actions"
                            @click.stop
                            @pointerdown.stop
                            @keydown.stop
                          >
                            <small>{{ directoryCount(data.id) }}</small>
                            <ElDropdown trigger="click">
                              <ElButton
                                link
                                class="directory-menu-button"
                                :aria-label="`${data.label}目录操作`"
                                ><ArtSvgIcon icon="ri:more-2-fill"
                              /></ElButton>
                              <template #dropdown
                                ><ElDropdownMenu>
                                  <ElDropdownItem @click="addDirectory(data)"
                                    >新增子目录</ElDropdownItem
                                  >
                                  <ElDropdownItem
                                    v-if="data.id !== 'all'"
                                    @click="renameDirectory(data)"
                                    >重命名</ElDropdownItem
                                  >
                                  <ElDropdownItem
                                    v-if="data.id !== 'all'"
                                    divided
                                    @click="deleteDirectory(data)"
                                    >删除目录</ElDropdownItem
                                  >
                                </ElDropdownMenu></template
                              >
                            </ElDropdown>
                          </span></span
                        >
                      </div>
                    </template>
                  </ElTree>
                </ElCard>
                <div
                  class="directory-resizer"
                  role="separator"
                  tabindex="0"
                  aria-label="调整资源目录宽度"
                  aria-orientation="vertical"
                  :aria-valuenow="directoryWidth"
                  :aria-valuemin="230"
                  :aria-valuemax="directoryMaxWidth"
                  @pointerdown="startDirectoryResize"
                  @pointermove="resizeDirectory"
                  @pointerup="stopDirectoryResize"
                  @pointercancel="stopDirectoryResize"
                  @lostpointercapture="finishDirectoryResize"
                  @keydown.left.prevent="setDirectoryWidth(directoryWidth - 16)"
                  @keydown.right.prevent="setDirectoryWidth(directoryWidth + 16)"
                />
                <div class="resource-main">
                  <div class="resource-toolbar">
                    <div
                      ><ElButton type="primary" @click="openResourceEditor()">录入文本</ElButton
                      ><ElButton @click="notifyImport">上传文件</ElButton></div
                    >
                    <div class="resource-filters"
                      ><ElSelect v-model="searchScope" style="width: 130px"
                        ><ElOption label="当前目录" value="directory" /><ElOption
                          label="整个知识库"
                          value="all" /></ElSelect
                      ><ElInput
                        v-model="resourceKeyword"
                        clearable
                        placeholder="搜索资源名称"
                        class="resource-search"
                      /><ElSelect v-model="resourceSort" style="width: 130px"
                        ><ElOption label="自定义排序" value="custom" /><ElOption
                          label="名称排序"
                          value="name" /><ElOption label="最近更新" value="updated" /></ElSelect
                      ><ElCheckbox v-model="showResourceDetails">详细列</ElCheckbox></div
                    >
                  </div>
                  <div v-if="selectedResources.length" class="resource-batch"
                    ><span>已选 {{ selectedResources.length }} 项</span
                    ><ElButton @click="batchMoveVisible = true">移动到</ElButton
                    ><ElButton @click="batchTagVisible = true">设置标签</ElButton
                    ><ElButton @click="batchParticipation(true)">参与问答</ElButton
                    ><ElButton @click="batchParticipation(false)">不参与问答</ElButton></div
                  >
                  <div v-if="moveUndo" class="resource-batch"
                    >资源位置已更新<ElButton link type="primary" @click="undoResourceMove"
                      >撤销移动</ElButton
                    ></div
                  >
                  <VueDraggable
                    v-model="displayedResources"
                    :disabled="resourceSort !== 'custom'"
                    target="tbody"
                    handle=".resource-drag-handle"
                    :animation="220"
                    ghost-class="resource-drag-placeholder"
                    chosen-class="resource-drag-chosen"
                    @choose="chooseResourceDrag"
                    @end="resetResourceDrag"
                    @unchoose="resetResourceDrag"
                  >
                    <ElTable
                      :data="displayedResources"
                      row-key="id"
                      border
                      @selection-change="selectedResources = $event"
                      ><ElTableColumn type="selection" width="44" />
                      <ElTableColumn width="44"
                        ><template #default="{ row }"
                          ><span class="resource-drag-handle" :data-resource-id="row.id"
                            ><ArtSvgIcon icon="ri:draggable" /></span></template
                      ></ElTableColumn>
                      <ElTableColumn label="资源" min-width="240"
                        ><template #default="{ row }"
                          ><div class="resource-name"
                            ><ElImage
                              v-if="row.type === 'image'"
                              class="resource-thumb"
                              :src="row.preview"
                              fit="cover"
                            /><div
                              v-else-if="row.type === 'video'"
                              class="resource-thumb video-thumb"
                              ><img :src="cover1" /><ArtSvgIcon icon="ri:play-circle-fill" /></div
                            ><span v-else class="file-icon" :class="`file-${row.type}`"
                              ><ArtSvgIcon :icon="resourceIcon(row.type)" /></span
                            ><div
                              ><b>{{ row.name }}</b
                              ><small>{{ row.size }}</small
                              ><ElButton
                                v-if="searchScope === 'all'"
                                link
                                size="small"
                                @click="locateResource(row)"
                                >{{ directoryPath(row.directory) }}</ElButton
                              ></div
                            ></div
                          ></template
                        ></ElTableColumn
                      >
                      <ElTableColumn prop="type" label="类型" width="100"
                        ><template #default="{ row }"
                          ><ElTag effect="plain">{{ resourceTypeName(row.type) }}</ElTag></template
                        ></ElTableColumn
                      >
                      <ElTableColumn prop="parseStatus" label="处理状态" width="130"
                        ><template #default="{ row }"
                          ><ElTag
                            :type="parseTag(row.parseStatus)"
                            @click="showProcessing(row)"
                            style="cursor: pointer"
                            >{{ processingLabel(row.parseStatus) }}</ElTag
                          ></template
                        ></ElTableColumn
                      >
                      <ElTableColumn label="参与问答" width="100"
                        ><template #default="{ row }"
                          ><ElSwitch
                            :model-value="row.status === 'enabled'"
                            :disabled="row.type === 'file'"
                            @change="toggleResource(row)" /></template
                      ></ElTableColumn>
                      <ElTableColumn
                        v-if="showResourceDetails"
                        prop="chunks"
                        label="分段数"
                        width="85"
                      /><ElTableColumn
                        v-if="showResourceDetails"
                        prop="createdAt"
                        label="创建时间"
                        width="155"
                      /><ElTableColumn
                        prop="updatedAt"
                        label="更新时间"
                        width="155"
                      /><ElTableColumn
                        v-if="showResourceDetails"
                        prop="parsedAt"
                        label="最后解析"
                        width="155"
                      />
                      <ElTableColumn label="操作" width="150" fixed="right"
                        ><template #default="{ row }"
                          ><ElButton link type="primary" @click="previewResource(row)"
                            >预览</ElButton
                          ><ElButton link type="primary" @click="openResourceEditor(row)"
                            >编辑</ElButton
                          ><ElButton
                            link
                            type="danger"
                            :disabled="row.status === 'enabled'"
                            @click="removeResource(row)"
                            >删除</ElButton
                          ></template
                        ></ElTableColumn
                      >
                    </ElTable>
                  </VueDraggable>
                </div>
              </div>
            </ElTabPane>
          </ElTabs>
        </ElCard>
        <template v-else>
          <div v-if="kind === 'digital'" class="digital-profile">
            <ElImage :src="detailRow.avatar" fit="cover" :preview-src-list="[detailRow.avatar]" />
            <div
              ><h3>{{ detailRow.name }}</h3
              ><p>{{ detailRow.description }}</p></div
            >
          </div>
          <ElDescriptions :column="1" border
            ><ElDescriptionsItem v-for="item in details" :key="item.label" :label="item.label">{{
              item.value || '-'
            }}</ElDescriptionsItem></ElDescriptions
          >
          <ElDivider content-position="left">内容与说明</ElDivider>
          <div class="detail-content">{{
            detailRow.content || detailRow.description || detailRow.remark || '暂无说明'
          }}</div>
          <PromptVersions v-if="kind === 'prompt'" :row="detailRow" />
          <div v-if="kind === 'prompt' || kind === 'script'" class="detail-actions"
            ><ElButton type="primary" @click="openTest">模拟测试</ElButton
            ><ElButton @click="copyRow(detailRow)">复制为新条目</ElButton></div
          >
        </template>
      </template>
    </component>

    <ElDialog
      v-model="resourcePreviewVisible"
      destroy-on-close
      class="resource-dialog resource-preview-dialog"
      title="资源预览"
      :width="resourceDialogWidth"
      align-center
    >
      <template v-if="currentResource">
        <ElDescriptions :column="3" border class="preview-meta"
          ><ElDescriptionsItem label="资源名称" :span="2">{{
            currentResource.name
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="类型">{{
            resourceTypeName(currentResource.type)
          }}</ElDescriptionsItem></ElDescriptions
        >
        <ElAlert
          v-if="
            currentResource.localFile &&
            !currentResource.preview &&
            !['text', 'markdown'].includes(currentResource.type)
          "
          title="本地文件预览已随页面刷新失效，请重新选择原文件；资源记录仍保留。"
          type="info"
          :closable="false"
        /><div class="preview-box">
          <ElImage
            v-if="currentResource.type === 'image'"
            :src="currentResource.preview"
            fit="contain"
            :preview-src-list="currentResource.preview ? [currentResource.preview] : []"
          />
          <ArtVideoPlayer
            v-else-if="currentResource.type === 'video'"
            player-id="knowledge-video-preview"
            :video-url="currentResource.preview || sampleVideo"
            :poster-url="cover1"
            :autoplay="false"
            :playback-rates="[0.5, 1, 1.5, 2]"
          />
          <audio
            v-else-if="currentResource.type === 'audio'"
            :src="currentResource.preview"
            controls
          />
          <PdfPreview
            v-else-if="currentResource.type === 'pdf'"
            :src="currentResource.preview || ''"
          />
          <DocxPreview
            v-else-if="currentResource.type === 'document'"
            :src="currentResource.preview || ''"
            :fallback="currentResource.content"
          />
          <ArtTable
            v-else-if="currentResource.type === 'spreadsheet'"
            :data="currentResource.spreadsheetData || spreadsheetPreview"
            ><ElTableColumn
              v-for="key in Object.keys(
                (currentResource.spreadsheetData || spreadsheetPreview)[0] || {}
              )"
              :key="key"
              :prop="key"
              :label="key"
          /></ArtTable>
          <MarkdownEditor
            v-else-if="currentResource.type === 'markdown'"
            :key="currentResource.id"
            :model-value="currentResource.content"
            readonly
          />
          <div v-else class="text-preview">{{
            currentResource.content || '该文件已完成解析。接入文件服务后将在此展示原文和分段结果。'
          }}</div>
        </div>
      </template>
      <template #footer
        ><ElButton @click="resourcePreviewVisible = false">关闭</ElButton
        ><ElButton @click="downloadResource(currentResource!)">下载</ElButton
        ><ElButton @click="replaceResource(currentResource!)">替换文件</ElButton
        ><ElButton type="primary" @click="editFromPreview">{{
          ['text', 'markdown'].includes(currentResource?.type || '') ? '编辑正文' : '编辑说明'
        }}</ElButton></template
      >
    </ElDialog>

    <ElDialog
      v-model="resourceEditorVisible"
      destroy-on-close
      class="resource-dialog resource-editor-dialog"
      :title="resourceForm.id ? '编辑知识资源' : '录入文本资源'"
      :width="resourceDialogWidth"
      align-center
      :close-on-click-modal="false"
      :before-close="closeResourceEditor"
    >
      <ElForm :model="resourceForm" label-width="90px"
        ><ElFormItem label="资源名称"><ElInput v-model="resourceForm.name" /></ElFormItem
        ><ElFormItem label="资源类型"
          ><ElTag effect="plain">{{
            resourceTypeName(resourceForm.type || 'markdown')
          }}</ElTag></ElFormItem
        ><ElFormItem
          :label="['text', 'markdown'].includes(resourceForm.type || '') ? '资源内容' : '文件说明'"
          ><MarkdownEditor
            v-if="resourceForm.type === 'markdown' || resourceForm.type === 'text'"
            :key="resourceForm.id || 'new'"
            v-model="resourceEditorContent"
            class="!w-full" /><ElInput
            v-else
            v-model="resourceForm.content"
            type="textarea"
            :rows="9"
            maxlength="6000"
            show-word-limit
            placeholder="输入知识正文、摘要或文件说明" /></ElFormItem
        ><ElFormItem label="标签"
          ><ElSelect v-model="resourceTagNames" multiple filterable
            ><ElOption
              v-for="tag in aiState.tags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.name" /></ElSelect></ElFormItem
      ></ElForm>
      <template #footer
        ><ElButton @click="closeResourceEditor(() => (resourceEditorVisible = false))"
          >取消</ElButton
        ><ElButton
          v-if="['text', 'markdown'].includes(resourceForm.type || '')"
          @click="saveResource(false)"
          >保存草稿</ElButton
        ><ElButton type="primary" @click="saveResource(true)">{{
          ['text', 'markdown'].includes(resourceForm.type || '') ? '保存并处理' : '保存说明'
        }}</ElButton></template
      >
    </ElDialog>

    <ElDialog v-model="batchMoveVisible" title="移动资源" width="520px"
      ><ElTreeSelect
        v-model="batchDirectory"
        :data="directoryTree[0]?.children || []"
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        check-strictly
        placeholder="选择目标目录"
        style="width: 100%"
      /><template #footer
        ><ElButton @click="batchMoveVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="!batchDirectory" @click="moveBatch"
          >移动</ElButton
        ></template
      ></ElDialog
    >
    <ElDialog v-model="batchTagVisible" title="批量设置标签" width="520px"
      ><ElSelect v-model="batchTags" multiple filterable style="width: 100%"
        ><ElOption
          v-for="tag in aiState.tags"
          :key="tag.id"
          :value="tag.name"
          :label="tag.name" /></ElSelect
      ><p>所选资源的标签将替换为以上标签。</p
      ><template #footer
        ><ElButton @click="batchTagVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveBatchTags">保存</ElButton></template
      ></ElDialog
    >
    <ElDialog v-model="testVisible" title="内容模拟测试" width="680px" align-center>
      <ElAlert
        title="预演变量替换与话术展示，不调用真实模型。"
        type="warning"
        :closable="false"
        show-icon
        class="editor-tip"
      />
      <ElForm label-width="86px"
        ><ElFormItem v-if="kind === 'prompt'" label="测试问题"
          ><ElInput
            v-model="testInput"
            type="textarea"
            :rows="4"
            placeholder="输入一个学生问题或触发场景" /></ElFormItem
        ><ElFormItem
          v-for="v in kind === 'prompt'
            ? (detailRow?.variableDefs || []).filter((v: any) => v.name !== 'question')
            : []"
          :key="v.name"
          :label="v.name"
          ><ElInput
            v-model="testVariables[v.name]"
            :placeholder="v.defaultValue || '输入测试值'" /></ElFormItem
        ><ElFormItem label="预演结果"
          ><div class="test-result">{{
            testResult || '点击“运行测试”查看模板或话术的模拟结果。'
          }}</div></ElFormItem
        ></ElForm
      >
      <template #footer
        ><ElButton @click="testVisible = false">关闭</ElButton
        ><ElButton type="primary" @click="runTest">运行测试</ElButton></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElAvatar,
    ElButton,
    ElDrawer,
    ElMessage,
    ElMessageBox,
    ElTag,
    type FormInstance,
    type FormRules,
    type TreeInstance
  } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { formatDateTime } from '@/utils/date'
  import avatar1 from '@/assets/images/avatar/avatar1.webp'
  import avatar2 from '@/assets/images/avatar/avatar2.webp'
  import avatar3 from '@/assets/images/avatar/avatar3.webp'
  import cover1 from '@/assets/images/cover/img1.webp'
  import MarkdownEditor from '../knowledge/components/MarkdownEditor.vue'
  import PdfPreview from '../knowledge/components/PdfPreview.vue'
  import DocxPreview from '../knowledge/components/DocxPreview.vue'
  import { VueDraggable } from 'vue-draggable-plus'
  import PromptVersions from './PromptVersions.vue'
  import {
    aiState,
    clone,
    references,
    scriptEvents,
    initialDirectories,
    type KnowledgeResource as Resource
  } from './ai-store'
  type Kind = 'knowledge' | 'prompt' | 'script' | 'digital'
  type Row = Record<string, any> & {
    id: number
    name: string
    status: 'enabled' | 'disabled'
    updatedAt: string
  }
  const props = defineProps<{ kind: Kind }>()
  const { kind } = toRefs(props)
  const labelsByKind = {
    knowledge: {
      add: '新建知识库',
      edit: '编辑知识库',
      detail: '知识库详情',
      empty: '尚未创建知识库',
      tip: '当前维护展示配置；文档解析与向量索引将在后端接入后生效。'
    },
    prompt: {
      add: '新建提示词模板',
      edit: '编辑提示词模板',
      detail: '模板详情',
      empty: '尚未创建提示词模板',
      tip: '编辑保存为草稿，详情中的发布操作会生成新版本；数字人固定使用其选定版本。'
    },
    script: {
      add: '新建话术',
      edit: '编辑话术',
      detail: '话术详情',
      empty: '尚未配置欢迎语或兜底话术',
      tip: '兜底话术应明确友好，不应补充未经知识库验证的事实。'
    },
    digital: {
      add: '新建数字人',
      edit: '编辑数字人',
      detail: '数字人详情',
      empty: '尚未创建数字人',
      tip: '在这里绑定知识库、提示词与欢迎话术；形象和声音后续单独配置。'
    }
  }
  const labels = computed(() => labelsByKind[kind.value])
  const nameLabel = computed(
    () =>
      ({ knowledge: '知识库名称', prompt: '模板名称', script: '话术名称', digital: '数字人名称' })[
        kind.value
      ]
  )
  const rows = computed<Row[]>({
    get: () => aiState[kind.value],
    set: (value) => {
      aiState[kind.value] = value
    }
  })
  const search = ref<Record<string, any>>({})
  const applied = ref<Record<string, any>>({})
  const loading = ref(false)
  const saving = ref(false)
  const editorVisible = ref(false)
  const detailVisible = ref(false)
  const editingId = ref<number>()
  const detailRow = ref<Row>()
  const form = reactive<Record<string, any>>({})
  const formRef = ref<FormInstance>()
  const pagination = reactive({ current: 1, size: 20, total: 0 })
  const resources = computed<Resource[]>({
    get: () => {
      const id = String(detailRow.value?.id || 1)
      return aiState.resourcesByBase[id] ?? (aiState.resourcesByBase[id] = [])
    },
    set: (value) => {
      aiState.resourcesByBase[String(detailRow.value?.id || 1)] = value
    }
  })
  const resourceTypes = [
    { label: '纯文本', value: 'text' },
    { label: 'Markdown', value: 'markdown' },
    { label: 'Word 文档', value: 'document' },
    { label: 'PDF', value: 'pdf' },
    { label: '图片', value: 'image' },
    { label: '视频', value: 'video' },
    { label: '音频', value: 'audio' },
    { label: 'Excel', value: 'spreadsheet' },
    { label: '其他文件', value: 'file' }
  ]
  const knowledgeTab = ref('overview'),
    resourceKeyword = ref(''),
    resourcePreviewVisible = ref(false),
    resourceEditorVisible = ref(false),
    currentResource = ref<Resource>()
  const resourceForm = reactive<Partial<Resource>>({})
  const testVariables = ref<Record<string, string>>({}),
    testVisible = ref(false),
    testInput = ref(''),
    testResult = ref('')
  const selectedResourceId = ref<number>(),
    searchScope = ref('directory'),
    resourceSort = ref('custom'),
    showResourceDetails = ref(false)
  const selectedResources = ref<Resource[]>([]),
    batchMoveVisible = ref(false),
    batchTagVisible = ref(false),
    batchDirectory = ref<string>(),
    batchTags = ref<string[]>([])
  const resourceTagNames = computed({
    get: () => resourceForm.tags?.split(',').filter(Boolean) || [],
    set: (tags: string[]) => {
      resourceForm.tags = tags.join(',')
    }
  })
  let resourceInitial = ''
  const moveUndo = ref<{ base: number; order: number[]; directories: Record<number, string> }>()
  function captureMove() {
    moveUndo.value = {
      base: detailRow.value?.id || 1,
      order: resources.value.map((r) => r.id),
      directories: Object.fromEntries(resources.value.map((r) => [r.id, r.directory]))
    }
  }
  function undoResourceMove() {
    const undo = moveUndo.value
    if (!undo || undo.base !== (detailRow.value?.id || 1)) return
    resources.value.forEach((r) => {
      if (undo.directories[r.id]) r.directory = undo.directories[r.id]
    })
    resources.value = [...resources.value].sort((a, b) => {
      const ai = undo.order.indexOf(a.id),
        bi = undo.order.indexOf(b.id)
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi)
    })
    moveUndo.value = undefined
  }
  function locateResource(row: Resource) {
    selectedDirectory.value = row.directory
    searchScope.value = 'directory'
    resourceKeyword.value = ''
  }
  function saveBatchTags() {
    selectedResources.value.forEach((r) => (r.tags = batchTags.value.join(',')))
    batchTagVisible.value = false
  }
  function moveBatch() {
    if (!batchDirectory.value) return
    captureMove()
    selectedResources.value.forEach((r) => {
      r.directory = batchDirectory.value!
      r.updatedAt = new Date().toISOString()
    })
    batchMoveVisible.value = false
    ElMessage.success('资源已移动，可撤销')
  }
  function batchParticipation(enabled: boolean) {
    selectedResources.value.forEach((r) => {
      if (r.type !== 'file') r.status = enabled ? 'enabled' : 'disabled'
    })
    ElMessage.success('参与问答设置已更新，附件不参与问答')
  }
  function directoryPath(id: string) {
    function find(nodes: Directory[], parents: string[]): string | undefined {
      for (const n of nodes) {
        const path = [...parents, n.label]
        if (n.id === id) return path.join(' / ')
        const result = find(n.children || [], path)
        if (result) return result
      }
    }
    return find(directoryTree.value, []) || '未知目录'
  }
  function processingLabel(value: string) {
    return (
      (
        { 已完成: '可用于问答', 等待解析: '待处理', 不参与解析: '仅保存附件' } as Record<
          string,
          string
        >
      )[value] || value
    )
  }
  async function showProcessing(r: Resource) {
    if (r.parseStatus.includes('失败')) {
      try {
        await ElMessageBox.confirm(r.content || '处理失败，请重试', '处理详情', {
          confirmButtonText: '标记重试',
          cancelButtonText: '关闭'
        })
        r.parseStatus = '等待解析'
        ElMessage.success('已标记待处理（前端预览）')
      } catch {
        /* 用户取消 */
      }
    } else
      ElMessageBox.alert(
        `${processingLabel(r.parseStatus)}；${r.status === 'enabled' ? '参与问答' : '不参与问答'}。当前为前端状态演示，不执行实际解析。`,
        '处理详情'
      )
  }
  async function closeResourceEditor(done: () => void) {
    if (JSON.stringify(resourceForm) !== resourceInitial) {
      try {
        await ElMessageBox.confirm('放弃未保存的内容？', '未保存修改', { type: 'warning' })
      } catch {
        return
      }
    }
    done()
  }
  watch(
    () => detailRow.value?.id,
    () => {
      selectedResources.value = []
      moveUndo.value = undefined
      batchDirectory.value = undefined
    }
  )
  const resourceDialogWidth = 'min(1200px, 94vw)'
  const resourceEditorContent = computed({
    get: () => resourceForm.content || '',
    set: (value: string) => {
      resourceForm.content = value
    }
  })
  type Directory = { id: string; label: string; children?: Directory[]; resource?: Resource }
  const directoryTree = computed<Directory[]>({
    get: () => {
      const id = String(detailRow.value?.id || 1)
      return (
        aiState.directoriesByBase[id] ?? (aiState.directoriesByBase[id] = clone(initialDirectories))
      )
    },
    set: (value) => {
      aiState.directoriesByBase[String(detailRow.value?.id || 1)] = value
    }
  })
  const selectedDirectory = ref('all')
  const spreadsheetPreview = ref<Record<string, unknown>[]>([
    { 藏品名称: '后母戊鼎', 年代: '商代', 类别: '青铜器' },
    { 藏品名称: '四羊方尊', 年代: '商代晚期', 类别: '青铜器' }
  ])
  const sampleVideo =
    '//lf3-static.bytednsdoc.com/obj/eden-cn/nupenuvpxnuvo/xgplayer_doc/xgplayer-demo.mp4'
  const rules: FormRules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    theme: [{ required: true, message: '请选择主题', trigger: 'change' }],
    embedding: [{ required: true, message: '请选择向量模型', trigger: 'change' }],
    scene: [{ required: true, message: '请选择场景', trigger: 'change' }],
    version: [{ required: true, message: '请输入版本', trigger: 'blur' }],
    category: [{ required: true, message: '请选择类型', trigger: 'change' }],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
    knowledge: [{ required: true, message: '请选择知识库', trigger: 'change' }],
    prompt: [{ required: true, message: '请选择提示词', trigger: 'change' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
  }
  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      props: { clearable: true, placeholder: '搜索名称或内容' }
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '全部状态',
        options: [
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' }
        ]
      }
    }
  ]
  const filtered = computed(() =>
    rows.value.filter(
      (r) =>
        (!applied.value.keyword ||
          [r.name, r.content, r.theme, r.scene, r.category]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(String(applied.value.keyword).toLowerCase())) &&
        (!applied.value.status || r.status === applied.value.status)
    )
  )
  const pageRows = computed(() =>
    filtered.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const hasSearch = computed(() => Object.keys(applied.value).length > 0)
  watch(
    filtered,
    (v) => {
      pagination.total = v.length
    },
    { immediate: true }
  )
  const summary = computed(() => [
    {
      label: '配置总数',
      value: rows.value.length,
      icon: kind.value === 'digital' ? 'ri:user-smile-line' : 'ri:database-2-line'
    },
    {
      label: '已启用',
      value: rows.value.filter((r) => r.status === 'enabled').length,
      icon: 'ri:checkbox-circle-line'
    },
    {
      label: '待配置/停用',
      value: rows.value.filter((r) => r.status === 'disabled').length,
      icon: 'ri:time-line'
    },
    {
      label:
        kind.value === 'knowledge'
          ? '文档总数'
          : kind.value === 'digital'
            ? '累计会话'
            : '内容条目',
      value:
        kind.value === 'knowledge'
          ? rows.value.reduce((n, r) => n + (aiState.resourcesByBase[String(r.id)]?.length || 0), 0)
          : kind.value === 'digital'
            ? rows.value.reduce((n, r) => n + (r.sessions || 0), 0).toLocaleString()
            : rows.value.length,
      icon: 'ri:bar-chart-box-line'
    }
  ])
  const statusCol = {
    prop: 'status',
    label: '状态',
    width: 90,
    formatter: (r: Row) =>
      h(ElTag, { type: r.status === 'enabled' ? 'success' : 'info' }, () =>
        r.status === 'enabled' ? '启用' : '停用'
      )
  }
  const opCol = {
    prop: 'operation',
    label: '操作',
    width: 170,
    fixed: 'right' as const,
    disabled: true,
    formatter: (r: Row) =>
      h('div', { class: 'flex items-center' }, [
        h(ArtButtonTable, { type: 'view', onClick: () => showDetail(r) }),
        h(ArtButtonTable, { type: 'edit', onClick: () => openEditor(r) }),
        h(ArtButtonTable, { type: 'delete', onClick: () => remove(r) })
      ])
  }
  const { columns, columnChecks } = useTableColumns<Row>(() => {
    const c: any[] = [{ type: 'globalIndex', label: '序号', width: 70 }]
    if (kind.value === 'digital')
      c.push({
        prop: 'avatar',
        label: '形象',
        width: 86,
        fixed: 'left',
        formatter: (r: Row) =>
          h(ElAvatar, {
            src: r.avatar,
            shape: 'square',
            size: 48,
            onClick: () => showDetail(r),
            style: 'cursor:pointer'
          })
      })
    c.push({ prop: 'name', label: '名称', minWidth: 190, fixed: 'left', showOverflowTooltip: true })
    if (kind.value === 'knowledge')
      c.push(
        { prop: 'theme', label: '所属主题', width: 130 },
        { prop: 'embedding', label: '向量模型', minWidth: 190 },
        {
          prop: 'documents',
          label: '资源数',
          width: 90,
          formatter: (r: Row) => aiState.resourcesByBase[String(r.id)]?.length || 0
        },
        { prop: 'description', label: '说明', minWidth: 180, showOverflowTooltip: true }
      )
    if (kind.value === 'prompt')
      c.push(
        { prop: 'scene', label: '应用场景', width: 120 },
        { prop: 'version', label: '版本', width: 90 },
        { prop: 'variables', label: '模板变量', minWidth: 180 },
        { prop: 'content', label: '内容摘要', minWidth: 260, showOverflowTooltip: true }
      )
    if (kind.value === 'script')
      c.push(
        { prop: 'category', label: '话术类型', width: 140 },
        { prop: 'digitalHuman', label: '适用数字人', width: 130 },
        { prop: 'content', label: '话术内容', minWidth: 320, showOverflowTooltip: true }
      )
    if (kind.value === 'digital')
      c.push(
        { prop: 'role', label: '角色类型', width: 140 },
        { prop: 'knowledge', label: '绑定知识库', minWidth: 180 },
        { prop: 'prompt', label: '提示词模板', minWidth: 160 },
        { prop: 'welcome', label: '欢迎话术', minWidth: 150 },
        { prop: 'sessions', label: '累计会话', width: 100 }
      )
    c.push({
      prop: 'references',
      label: '使用情况',
      minWidth: 130,
      formatter: (r: Row) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () =>
              ElMessageBox.alert(references(kind.value, r.id).join('、') || '暂无引用', '引用对象')
          },
          () => `${references(kind.value, r.id).length} 个引用`
        )
    })
    return [
      ...c,
      statusCol,
      {
        prop: 'updatedAt',
        label: '更新时间',
        width: 180,
        formatter: (r: Row) => formatDateTime(r.updatedAt)
      },
      opCol
    ]
  })
  const blank = () => ({
    event: 'serviceError',
    scope: 'global',
    digitalId: undefined,
    spokenContent: '',
    action: 'retry',
    variableDefs: [],
    publishedVersion: 0,
    releases: [],
    embeddingId: aiState.models.find((m) => m.purpose === 'embedding' && m.isDefault)?.id,
    name: '',
    status: 'enabled',
    remark: '',
    theme: '',
    embedding: 'text-embedding-3-small',
    chunkSize: 800,
    overlap: 120,
    scene: '',
    version: 'V1.0',
    content: '',
    variables: '',
    category: '',
    digitalHuman: '全部数字人',
    trigger: '',
    role: '',
    knowledge: '',
    prompt: '',
    welcome: '通用欢迎语',
    description: ''
  })
  function applySearch(v: Record<string, any>) {
    applied.value = { ...v }
    pagination.current = 1
  }
  function resetSearch() {
    search.value = {}
    applied.value = {}
    pagination.current = 1
  }
  async function refresh() {
    loading.value = true
    await nextTick()
    loading.value = false
    ElMessage.success('数据已刷新')
  }
  function changeSize(v: number) {
    pagination.size = v
    pagination.current = 1
  }
  function changePage(v: number) {
    pagination.current = v
  }
  function openEditor(r?: Row) {
    editingId.value = r?.id
    Object.keys(form).forEach((k) => delete form[k])
    Object.assign(
      form,
      blank(),
      r ? clone(r) : {},
      kind.value === 'digital' && !r ? { avatar: avatar1 } : {}
    )
    configInitial = JSON.stringify(form)
    editorVisible.value = true
    nextTick(() => {
      formRef.value?.clearValidate()
      configInitial = JSON.stringify(form)
    })
  }
  async function save() {
    if (!formRef.value || !(await formRef.value.validate())) return
    if (kind.value === 'knowledge' && form.overlap >= form.chunkSize)
      return void ElMessage.warning('重叠字符数必须小于分段字符数')
    if (
      editingId.value &&
      form.status === 'disabled' &&
      references(kind.value, editingId.value).length
    ) {
      if (kind.value === 'script') {
        try {
          await ElMessageBox.confirm(
            '停用后部分草稿将缺少自动匹配话术，已发布快照不变。继续停用？',
            '引用提醒',
            { type: 'warning' }
          )
        } catch {
          return
        }
      } else
        return void ElMessage.warning(
          '仍被引用，请先调整：' + references(kind.value, editingId.value).join('、')
        )
    }
    if (kind.value === 'script') {
      if (!form.event || (form.scope === 'digital' && !form.digitalId))
        return void ElMessage.warning('请选择触发事件和适用数字人')
      if (
        form.status === 'enabled' &&
        rows.value.some(
          (r) =>
            r.id !== editingId.value &&
            r.status === 'enabled' &&
            r.event === form.event &&
            r.scope === form.scope &&
            (r.scope === 'global' || r.digitalId === form.digitalId)
        )
      )
        return void ElMessage.warning('此范围内该事件已有启用话术，请先停用或修改原话术')
      form.digitalHuman =
        form.scope === 'global'
          ? '全部数字人'
          : aiState.digital.find((d) => d.id === form.digitalId)?.name
    }
    if (kind.value === 'knowledge')
      form.embedding = aiState.models.find((m) => m.id === form.embeddingId)?.model || ''
    saving.value = true
    const p = {
      ...clone(form),
      name: String(form.name).trim(),
      status: (form.status === 'disabled' ? 'disabled' : 'enabled') as Row['status'],
      updatedAt: new Date().toISOString()
    }
    if (editingId.value) {
      const i = rows.value.findIndex((r) => r.id === editingId.value)
      Object.assign(rows.value[i], p)
    } else
      rows.value.unshift({
        ...p,
        id: Math.max(0, ...rows.value.map((r) => r.id)) + 1,
        documents: 0,
        chunks: 0,
        sessions: 0
      } as Row)
    await nextTick()
    saving.value = false
    editorVisible.value = false
    ElMessage.success('保存成功')
  }
  async function remove(r: Row) {
    if (kind.value === 'knowledge' && aiState.resourcesByBase[String(r.id)]?.length)
      return void ElMessage.warning('请先移出或删除知识库中的资源')
    const refs = references(kind.value, r.id)
    if (refs.length) return void ElMessage.warning('仍被引用：' + refs.join('、'))
    try {
      await ElMessageBox.confirm(`确定删除“${r.name}”吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      })
      rows.value = rows.value.filter((v) => v.id !== r.id)
      ElMessage.success('删除成功')
    } catch {
      /* 用户取消 */
    }
  }
  function showDetail(r: Row) {
    detailRow.value = r
    detailVisible.value = true
    if (kind.value === 'knowledge') {
      selectedDirectory.value = 'all'
      resourceKeyword.value = ''
      expandedDirectoryIds.value = ['all']
    }
  }
  function notifyImport() {
    chooseLocalFiles()
  }
  function notifyAvatarUpload() {
    ElMessage.info('图片上传入口已预留，后续接入文件服务')
  }
  let configInitial = ''
  async function closeConfigEditor(done: () => void) {
    if (JSON.stringify(form) !== configInitial) {
      try {
        await ElMessageBox.confirm('放弃尚未保存的修改？', '未保存修改', { type: 'warning' })
      } catch {
        return
      }
    }
    done()
  }
  watch(
    () => form.content,
    (content) => {
      if (kind.value !== 'prompt') return
      const names = [
        ...new Set(
          Array.from(String(content || '').matchAll(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g), (m) => m[1])
        )
      ]
      form.variableDefs = names.map(
        (name) =>
          form.variableDefs?.find((v: any) => v.name === name) || {
            name,
            description: '',
            required: true,
            defaultValue: '',
            testValue: ''
          }
      )
      form.variables = names.join(', ')
    }
  )
  const titleMap: Record<string, string> = {
    event: '触发事件',
    scope: '适用范围',
    digitalId: '数字人编号',
    spokenContent: '播报文本',
    action: '后续动作',
    name: '名称',
    status: '状态',
    updatedAt: '更新时间',
    remark: '备注',
    theme: '所属主题',
    embedding: '向量模型',
    documents: '文档数',
    chunks: '分段数',
    scene: '应用场景',
    version: '版本',
    variables: '模板变量',
    category: '话术类型',
    digitalHuman: '适用数字人',
    trigger: '触发说明',
    role: '角色类型',
    knowledge: '知识库',
    prompt: '提示词',
    welcome: '欢迎话术',
    sessions: '累计会话'
  }
  const details = computed(() => {
    const row = detailRow.value
    if (!row) return []
    const keys =
      kind.value === 'knowledge'
        ? ['name', 'theme', 'description', 'embedding', 'status', 'updatedAt', 'remark']
        : kind.value === 'prompt'
          ? ['name', 'scene', 'version', 'variables', 'status', 'updatedAt', 'remark']
          : kind.value === 'script'
            ? [
                'name',
                'event',
                'scope',
                'digitalHuman',
                'spokenContent',
                'action',
                'status',
                'updatedAt',
                'remark'
              ]
            : ['name', 'role', 'knowledge', 'prompt', 'welcome', 'status', 'updatedAt', 'remark']
    return keys.map((key) => {
      let value = row[key]
      if (key === 'status') value = value === 'enabled' ? '启用' : '停用'
      if (key === 'scope') value = value === 'global' ? '全局默认' : '指定数字人'
      if (key === 'event') value = scriptEvents.find((e) => e.key === value)?.label || value
      if (key === 'action')
        value =
          (
            { none: '无', retry: '重试', recommend: '推荐问题', home: '返回首页' } as Record<
              string,
              string
            >
          )[value] || value
      return {
        label: titleMap[key] || ({ description: '说明' } as Record<string, string>)[key] || key,
        value
      }
    })
  })
  const directoryTreeRef = ref<TreeInstance>()
  function directoryIds(nodes: Directory[]): string[] {
    return nodes.flatMap((node) => [node.id, ...directoryIds(node.children || [])])
  }
  // Keep expansion separate from the derived tree, which is rebuilt on resource changes.
  const expandedDirectoryIds = ref<string[]>(directoryIds(directoryTree.value))
  const hasExpandedDirectories = computed(() => {
    const roots = new Set(directoryTree.value.map((root) => root.id))
    const existing = new Set(directoryIds(directoryTree.value))
    return expandedDirectoryIds.value.some((id) => !roots.has(id) && existing.has(id))
  })
  function rememberDirectoryExpansion(data: Directory, expanded: boolean) {
    if (data.resource) return
    const ids = new Set(expandedDirectoryIds.value)
    if (expanded) ids.add(data.id)
    else ids.delete(data.id)
    expandedDirectoryIds.value = [...ids]
  }
  async function expandDirectory(id: string) {
    const directory = findDirectory(directoryTree.value, id)
    if (!directory) return
    rememberDirectoryExpansion(directory, true)
    await nextTick()
    directoryTreeRef.value?.getNode(id)?.expand()
  }
  function setDirectoriesExpanded(expanded: boolean) {
    const roots = new Set(directoryTree.value.map((root) => root.id))
    expandedDirectoryIds.value = expanded ? directoryIds(directoryTree.value) : [...roots]
    for (const id of directoryIds(directoryTree.value)) {
      const node = directoryTreeRef.value?.getNode(id)
      if (expanded || roots.has(id)) node?.expand()
      else node?.collapse()
    }
  }
  const resourceLayoutRef = ref<HTMLElement>()
  const directoryWidth = ref(340)
  const directoryMaxWidth = ref(560)
  const resizingDirectory = ref(false)
  let resizeStartX = 0
  let resizeStartWidth = 0
  let pendingDirectoryWidth = directoryWidth.value
  let resizeFrame: number | undefined
  function measureDirectoryLimit() {
    const available = resourceLayoutRef.value?.clientWidth || 900
    directoryMaxWidth.value = Math.max(230, Math.min(560, available - 376, available * 0.45))
  }
  function clampDirectoryWidth(width: number) {
    return Math.round(Math.max(230, Math.min(directoryMaxWidth.value, width)))
  }
  function paintDirectoryWidth() {
    resizeFrame = undefined
    resourceLayoutRef.value?.style.setProperty('--directory-width', `${pendingDirectoryWidth}px`)
  }
  function setDirectoryWidth(width: number) {
    measureDirectoryLimit()
    pendingDirectoryWidth = clampDirectoryWidth(width)
    directoryWidth.value = pendingDirectoryWidth
    paintDirectoryWidth()
  }
  function startDirectoryResize(event: PointerEvent) {
    if (event.button !== 0 || resizingDirectory.value) return
    event.preventDefault()
    // Read layout once before dragging; pointer moves only write the CSS width.
    measureDirectoryLimit()
    resizeStartWidth =
      resourceLayoutRef.value?.querySelector<HTMLElement>('.directory-card')?.offsetWidth ||
      directoryWidth.value
    pendingDirectoryWidth = clampDirectoryWidth(resizeStartWidth)
    resizeStartX = event.clientX
    resizingDirectory.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  function resizeDirectory(event: PointerEvent) {
    if (!resizingDirectory.value) return
    pendingDirectoryWidth = clampDirectoryWidth(resizeStartWidth + event.clientX - resizeStartX)
    // Coalesce pointer events into one paint per frame without rerendering the resource tree/table.
    if (resizeFrame === undefined) resizeFrame = requestAnimationFrame(paintDirectoryWidth)
  }
  function finishDirectoryResize() {
    if (!resizingDirectory.value) return
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
    paintDirectoryWidth()
    directoryWidth.value = pendingDirectoryWidth
    resizingDirectory.value = false
  }
  function stopDirectoryResize(event: PointerEvent) {
    if (event.type === 'pointerup') resizeDirectory(event)
    finishDirectoryResize()
    const handle = event.currentTarget as HTMLElement
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
  }
  onBeforeUnmount(() => {
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
  })
  // File nodes are derived from the same resources as the table so moves and edits stay in sync.
  const resourceTree = computed(() => {
    function withFiles(directories: Directory[]): Directory[] {
      return directories.map((directory) => ({
        ...directory,
        children: [
          ...withFiles(directory.children || []),
          ...resources.value
            .filter((resource) => resource.directory === directory.id)
            .map((resource) => ({
              id: `resource-${resource.id}`,
              label: resource.name,
              resource
            }))
        ]
      }))
    }
    return withFiles(directoryTree.value)
  })
  const draggingTreeId = ref<string>()
  const landedTreeId = ref<string>()
  let landingTimer: ReturnType<typeof setTimeout> | undefined
  function startTreeDrag(node: { data: Record<string, any> }) {
    draggingTreeId.value = node.data.id
  }
  function endTreeDrag() {
    draggingTreeId.value = undefined
  }
  function showDropLanding(id: string) {
    if (landingTimer !== undefined) clearTimeout(landingTimer)
    landedTreeId.value = id
    landingTimer = setTimeout(() => {
      landedTreeId.value = undefined
    }, 480)
  }
  onBeforeUnmount(() => {
    if (landingTimer !== undefined) clearTimeout(landingTimer)
  })
  function allowDirectoryDrag(node: { data: Record<string, unknown> }) {
    return node.data.id !== 'all' && (!node.data.resource || resourceSort.value === 'custom')
  }
  function moveDirectory(dragging: { data: Directory }, drop: { data: Directory }, type: string) {
    if (dragging.data.resource) {
      captureMove()
      const resource = resources.value.find((item) => item.id === dragging.data.resource?.id)
      const targetResource = resources.value.find((item) => item.id === drop.data.resource?.id)
      if (
        resource &&
        targetResource &&
        resource.id !== targetResource.id &&
        (type === 'before' || type === 'after')
      ) {
        const moved = resource.directory !== targetResource.directory
        const ordered = resources.value.filter((item) => item.id !== resource.id)
        const targetIndex = ordered.findIndex((item) => item.id === targetResource.id)
        resource.directory = targetResource.directory
        if (moved) resource.updatedAt = '刚刚'
        ordered.splice(targetIndex + (type === 'after' ? 1 : 0), 0, resource)
        resources.value = ordered
        showDropLanding(`resource-${resource.id}`)
        ElMessage.success(moved ? '资源已移动并排序' : '资源顺序已更新')
        return
      }
      if (resource && !drop.data.resource && drop.data.id !== 'all' && type === 'inner') {
        resource.directory = drop.data.id
        resource.updatedAt = '刚刚'
        showDropLanding(drop.data.id)
        ElMessage.success(`资料已移动到“${drop.data.label}”`)
        void expandDirectory(drop.data.id)
      }
      return
    }
    const directory = findDirectory(directoryTree.value, dragging.data.id)
    if (
      !directory ||
      directory.id === 'all' ||
      drop.data.resource ||
      findDirectory([directory], drop.data.id)
    )
      return
    function findSiblings(nodes: Directory[], id: string): Directory[] | undefined {
      if (nodes.some((node) => node.id === id)) return nodes
      for (const node of nodes) {
        const siblings = findSiblings(node.children || [], id)
        if (siblings) return siblings
      }
    }
    const target = findDirectory(directoryTree.value, drop.data.id)
    if (!target) return
    const siblings =
      type === 'inner' ? (target.children ??= []) : findSiblings(directoryTree.value, target.id)
    if (!siblings) return
    removeDirectory(directoryTree.value, directory.id)
    if (type === 'inner') siblings.push(directory)
    else
      siblings.splice(
        siblings.findIndex((node) => node.id === target.id) + (type === 'after' ? 1 : 0),
        0,
        directory
      )
    showDropLanding(type === 'inner' ? target.id : directory.id)
  }
  const visibleResources = computed(() => {
    const result = resources.value.filter(
      (r) =>
        (searchScope.value === 'all' ||
          selectedDirectory.value === 'all' ||
          r.directory === selectedDirectory.value) &&
        (!resourceKeyword.value ||
          r.name.toLowerCase().includes(resourceKeyword.value.toLowerCase()))
    )
    if (resourceSort.value === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    if (resourceSort.value === 'updated')
      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return result
  })
  const displayedResources = computed({
    get: () => visibleResources.value,
    set: (ordered: Resource[]) => {
      const ids = new Set(ordered.map((r) => r.id))
      let index = 0
      resources.value = resources.value.map((r) => (ids.has(r.id) ? ordered[index++] : r))
    }
  })
  function resourceTypeName(v: string) {
    return resourceTypes.find((t) => t.value === v)?.label || v
  }
  function resourceIcon(v: string) {
    return (
      (
        {
          text: 'ri:file-text-line',
          markdown: 'ri:markdown-line',
          document: 'ri:file-word-2-line',
          pdf: 'ri:file-pdf-2-line',
          image: 'ri:image-line',
          video: 'ri:video-line',
          audio: 'ri:file-music-line',
          spreadsheet: 'ri:file-excel-2-line',
          file: 'ri:attachment-2'
        } as Record<string, string>
      )[v] || 'ri:file-line'
    )
  }
  function parseTag(v: string) {
    return v === '已完成'
      ? 'success'
      : v === '解析失败'
        ? 'danger'
        : v === '解析中'
          ? 'warning'
          : 'info'
  }
  function previewResource(r: Resource) {
    currentResource.value = r
    resourcePreviewVisible.value = true
  }
  function openResourceEditor(r?: Resource) {
    Object.keys(resourceForm).forEach((k) => delete (resourceForm as any)[k])
    Object.assign(
      resourceForm,
      {
        id: undefined,
        name: '',
        type: 'markdown',
        directory: selectedDirectory.value === 'all' ? 'overview' : selectedDirectory.value,
        content: '',
        tags: ''
      },
      r ? clone(r) : {}
    )
    resourceInitial = JSON.stringify(resourceForm)
    resourceEditorVisible.value = true
  }
  function saveResource(process = true) {
    if (!resourceForm.name?.trim()) return void ElMessage.warning('请输入资源名称')
    const textual = ['text', 'markdown'].includes(resourceForm.type || '')
    const existing = resources.value.find((r) => r.id === resourceForm.id)
    const changes = {
      ...clone(resourceForm),
      name: resourceForm.name.trim(),
      updatedAt: new Date().toISOString()
    }
    if (existing)
      Object.assign(
        existing,
        changes,
        textual ? { parseStatus: process ? '等待解析' : '草稿', parsedAt: '-', chunks: 0 } : {}
      )
    else
      resources.value.unshift({
        ...changes,
        id: Math.max(0, ...resources.value.map((r) => r.id)) + 1,
        size: '文本录入',
        status: 'disabled',
        parseStatus: process ? '等待解析' : '草稿',
        chunks: 0,
        createdAt: new Date().toISOString(),
        parsedAt: '-'
      } as Resource)
    resourceEditorVisible.value = false
    ElMessage.success(
      !textual ? '资源说明已保存' : process ? '已保存并标记待处理（前端预览）' : '资源草稿已保存'
    )
  }

  async function removeResource(r: Resource) {
    if (r.status === 'enabled') return void ElMessage.warning('请先停用资源再删除')
    try {
      await ElMessageBox.confirm(`确定删除已停用资源“${r.name}”吗？`, '删除资源', {
        type: 'warning'
      })
      resources.value = resources.value.filter((v) => v.id !== r.id)
      ElMessage.success('资源已删除')
    } catch {
      /* 取消 */
    }
  }
  function toggleResource(r: Resource) {
    r.status = r.status === 'enabled' ? 'disabled' : 'enabled'
    ElMessage.success(
      r.status === 'enabled' ? '已设为参与问答，处理完成后可供检索' : '已设为不参与问答'
    )
  }
  function editFromPreview() {
    if (!currentResource.value) return
    resourcePreviewVisible.value = false
    openResourceEditor(currentResource.value)
  }
  function findDirectory(nodes: Directory[], id: string): Directory | undefined {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = node.children && findDirectory(node.children, id)
      if (found) return found
    }
  }
  function selectDirectory(data: Directory) {
    selectedDirectory.value = data.resource ? data.resource.directory : data.id
    if (data.resource) selectedResourceId.value = data.resource.id
  }
  function directoryCount(id: string) {
    return id === 'all'
      ? resources.value.length
      : resources.value.filter((r) => r.directory === id).length
  }
  async function addDirectory(data: Directory) {
    const parent = findDirectory(directoryTree.value, data.id)
    if (!parent) return
    try {
      const { value } = await ElMessageBox.prompt('请输入子目录名称', '新增子目录', {
        inputPattern: /\S+/,
        inputErrorMessage: '目录名称不能为空'
      })
      parent.children ??= []
      parent.children.push({ id: `custom-${Date.now()}`, label: value.trim(), children: [] })
      await nextTick()
      await expandDirectory(parent.id)
      ElMessage.success('子目录已新增')
    } catch {
      /* 用户取消 */
    }
  }
  function allowDirectoryDrop(
    dragging: { data: Record<string, any> },
    drop: { data: Record<string, any> },
    type: string
  ) {
    if (drop.data.resource) {
      return Boolean(
        dragging.data.resource &&
          dragging.data.resource.id !== drop.data.resource.id &&
          (type === 'prev' || type === 'next')
      )
    }
    if (dragging.data.resource) {
      return (
        type === 'inner' &&
        drop.data.id !== 'all' &&
        dragging.data.resource.directory !== drop.data.id
      )
    }
    const directory = findDirectory(directoryTree.value, dragging.data.id)
    return Boolean(
      directory &&
        directory.id !== 'all' &&
        !findDirectory([directory], drop.data.id) &&
        (drop.data.id !== 'all' || type === 'inner')
    )
  }
  const draggingResource = ref<Resource>()
  const dropDirectoryId = ref<string>()
  function chooseResourceDrag(event: { item: HTMLElement }) {
    const id = event.item.querySelector<HTMLElement>('[data-resource-id]')?.dataset.resourceId
    draggingResource.value = resources.value.find((resource) => String(resource.id) === id)
    dropDirectoryId.value = undefined
  }
  function resetResourceDrag() {
    endTreeDrag()
    draggingResource.value = undefined
    dropDirectoryId.value = undefined
  }
  function canDropResource(dir: Directory) {
    return Boolean(
      draggingResource.value &&
        !dir.resource &&
        dir.id !== 'all' &&
        draggingResource.value.directory !== dir.id
    )
  }
  function hoverResourceDirectory(event: DragEvent, dir: Directory) {
    if (!draggingResource.value) return
    event.stopPropagation()
    dropDirectoryId.value = canDropResource(dir) ? dir.id : undefined
    if (event.dataTransfer) event.dataTransfer.dropEffect = canDropResource(dir) ? 'move' : 'none'
    if (canDropResource(dir)) event.preventDefault()
  }
  function leaveResourceDirectory(event: DragEvent, dir: Directory) {
    if (
      event.relatedTarget instanceof Node &&
      (event.currentTarget as HTMLElement).contains(event.relatedTarget)
    )
      return
    if (dropDirectoryId.value === dir.id) dropDirectoryId.value = undefined
  }
  function dropResourceToDirectory(event: DragEvent, dir: Directory) {
    if (!draggingResource.value) return
    event.preventDefault()
    event.stopPropagation()
    if (canDropResource(dir)) {
      captureMove()
      draggingResource.value.directory = dir.id
      draggingResource.value.updatedAt = '刚刚'
      showDropLanding(dir.id)
      ElMessage.success(`资料已移动到“${dir.label}”`)
      void expandDirectory(dir.id)
    }
    resetResourceDrag()
  }
  onMounted(() => window.addEventListener('dragend', resetResourceDrag))
  onBeforeUnmount(() => window.removeEventListener('dragend', resetResourceDrag))
  async function renameDirectory(data: Directory) {
    const directory = findDirectory(directoryTree.value, data.id)
    if (!directory || directory.id === 'all') return
    try {
      const { value } = await ElMessageBox.prompt('请输入新名称', '重命名目录', {
        inputValue: directory.label,
        inputPattern: /\S+/,
        inputErrorMessage: '目录名称不能为空'
      })
      directory.label = value.trim()
      ElMessage.success('目录已重命名')
    } catch {
      /* 用户取消 */
    }
  }
  function removeDirectory(nodes: Directory[], id: string): boolean {
    const index = nodes.findIndex((n) => n.id === id)
    if (index >= 0) {
      nodes.splice(index, 1)
      return true
    }
    return nodes.some((n) => n.children && removeDirectory(n.children, id))
  }
  async function deleteDirectory(data: Directory) {
    const directory = findDirectory(directoryTree.value, data.id)
    if (!directory || directory.id === 'all') return
    const hasResources = () =>
      resources.value.some((resource) => Boolean(findDirectory([directory], resource.directory)))
    if (hasResources()) return void ElMessage.warning('请先移动或删除目录及其子目录中的资源')
    try {
      await ElMessageBox.confirm(`确定删除“${directory.label}”及其空子目录吗？`, '删除目录', {
        type: 'warning'
      })
      if (hasResources()) return void ElMessage.warning('请先移动或删除目录及其子目录中的资源')
      const selectionRemoved = Boolean(findDirectory([directory], selectedDirectory.value))
      removeDirectory(directoryTree.value, directory.id)
      if (selectionRemoved) selectedDirectory.value = 'all'
      ElMessage.success('目录已删除')
    } catch {
      /* 用户取消 */
    }
  }

  function closeKnowledgeDetail() {
    resetResourceDrag()
    detailRow.value = undefined
    knowledgeTab.value = 'overview'
  }
  function downloadResource(r: Resource) {
    if (!r.preview && !['text', 'markdown'].includes(r.type))
      return void ElMessage.info('示例资源没有原文件，请上传或重新选择文件后下载')
    const url =
      r.preview ||
      URL.createObjectURL(new Blob([r.content || ''], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = r.name
    a.click()
    if (!r.preview) setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const localUrls = new Set<string>()
  onBeforeUnmount(() => {
    localUrls.forEach((url) => URL.revokeObjectURL(url))
  })
  function fileType(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    return (
      (
        {
          txt: 'text',
          md: 'markdown',
          markdown: 'markdown',
          docx: 'document',
          pdf: 'pdf',
          png: 'image',
          jpg: 'image',
          jpeg: 'image',
          webp: 'image',
          gif: 'image',
          mp4: 'video',
          webm: 'video',
          mp3: 'audio',
          wav: 'audio',
          m4a: 'audio',
          xlsx: 'spreadsheet',
          csv: 'spreadsheet'
        } as Record<string, string>
      )[ext || ''] || 'file'
    )
  }
  function chooseLocalFiles(replacing?: Resource) {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = !replacing
    const baseId = String(detailRow.value?.id || 1),
      directory = selectedDirectory.value === 'all' ? 'overview' : selectedDirectory.value
    input.onchange = async () => {
      for (const file of Array.from(input.files || [])) {
        if (replacing && fileType(file.name) !== replacing.type) {
          ElMessage.warning('替换文件需保持原资源类型')
          continue
        }
        const type = fileType(file.name),
          url = URL.createObjectURL(file)
        localUrls.add(url)
        const now = new Date().toISOString(),
          target = aiState.resourcesByBase[baseId] ?? (aiState.resourcesByBase[baseId] = [])
        const content = ['text', 'markdown'].includes(type) ? await file.text() : ''
        const payload = {
          name: file.name,
          type,
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          preview: url,
          localFile: true,
          content,
          updatedAt: now,
          parseStatus: type === 'file' ? '不参与解析' : '等待解析',
          parsedAt: '-',
          chunks: 0
        }
        if (replacing) Object.assign(replacing, payload)
        else
          target.unshift({
            ...payload,
            id: Math.max(0, ...target.map((r) => r.id)) + 1,
            directory,
            status: 'disabled',
            createdAt: now,
            tags: ''
          })
        if (type === 'spreadsheet') {
          try {
            const XLSX = await import('xlsx')
            const book = XLSX.read(await file.arrayBuffer(), { type: 'array' })
            const row = replacing || target.find((r) => r.preview === url)
            if (row)
              row.spreadsheetData = XLSX.utils
                .sheet_to_json(book.Sheets[book.SheetNames[0]])
                .slice(0, 200) as Record<string, unknown>[]
          } catch {
            ElMessage.warning('表格预览读取失败，文件记录已保留')
          }
        }
      }
      ElMessage.success('已加入本地资源列表；本次预览不上传、不解析文件')
    }
    input.click()
  }
  function replaceResource(r: Resource) {
    chooseLocalFiles(r)
  }

  function openTest() {
    testVariables.value = Object.fromEntries(
      (detailRow.value?.variableDefs || []).map((v: any) => [
        v.name,
        v.testValue || v.defaultValue || ''
      ])
    )
    testInput.value = ''
    testResult.value = ''
    testVisible.value = true
  }
  function runTest() {
    const row = detailRow.value
    if (!row) return
    if (kind.value === 'prompt') {
      const values = Object.fromEntries(
        (row.variableDefs || []).map((v: any) => [
          v.name,
          v.name === 'question'
            ? testInput.value || v.testValue || v.defaultValue
            : testVariables.value[v.name] || v.defaultValue
        ])
      )
      const missing = (row.variableDefs || []).filter((v: any) => v.required && !values[v.name])
      if (missing.length)
        return void ElMessage.warning(
          '缺少必填测试变量：' + missing.map((v: any) => v.name).join('、')
        )
      testResult.value = row.content.replace(
        /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g,
        (_: string, name: string) => values[name] || ''
      )
    } else
      testResult.value = `展示文本：${row.content}\n播报文本：${row.spokenContent || row.content}\n触发事件：${scriptEvents.find((e) => e.key === row.event)?.label || row.category}\n后续动作：${({ none: '无', retry: '重试', recommend: '推荐问题', home: '返回首页' } as Record<string, string>)[row.action] || '无'}`
  }
  function copyRow(r: Row) {
    const copy = {
      ...clone(r),
      releases: [],
      publishedVersion: 0,
      id: Math.max(...rows.value.map((v) => v.id)) + 1,
      name: `${r.name}（副本）`,
      version: r.version ? `${r.version}-copy` : r.version,
      status: 'disabled' as const,
      updatedAt: new Date().toISOString()
    }
    rows.value.unshift(copy)
    detailVisible.value = false
    ElMessage.success('已复制为停用的新版本')
  }
</script>

<style scoped lang="scss">
  .summary-row {
    margin-bottom: 16px;
  }

  .summary-card :deep(.el-card__body) {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 18px 20px;
  }

  .summary-icon {
    width: 42px;
    height: 42px;
    padding: 10px;
    color: var(--theme-color);
    background: var(--art-gray-100);
    border-radius: 12px;
  }

  .summary-card strong {
    display: block;
    font-size: 22px;
  }

  .summary-card span {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    color: var(--art-text-gray-500);
  }

  .editor-tip {
    margin-bottom: 20px;
  }

  .detail-content,
  .test-result {
    width: 100%;
    padding: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .detail-actions {
    margin-top: 20px;
  }

  .knowledge-detail-page {
    display: block;
    padding: 4px 0 20px;
  }

  .knowledge-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .knowledge-heading h1 {
    margin: 0;
    font-size: 24px;
  }

  .knowledge-heading p {
    margin: 6px 0 0;
    color: var(--art-text-gray-500);
  }

  .avatar-picker,
  .resource-toolbar,
  .resource-name,
  .digital-profile {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  .resource-layout {
    display: flex;
    gap: 16px;
    min-height: 560px;
  }

  .directory-card {
    flex: 0 0 230px;
  }

  .directory-card :deep(.el-card__body) {
    padding: 10px 8px;
  }

  .directory-header,
  .tree-node {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .tree-node > span {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .tree-node small {
    padding-right: 6px;
    color: var(--art-text-gray-400);
  }

  .resource-main {
    flex: 1;
    min-width: 0;
  }

  .resource-toolbar {
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .resource-toolbar > div:first-child {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .resource-search {
    width: 240px;
  }

  .resource-name small,
  .vector-state {
    display: block;
    margin-top: 4px;
    color: var(--art-text-gray-500);
  }

  .resource-thumb {
    width: 48px;
    height: 38px;
    border-radius: 6px;
  }

  .video-thumb {
    position: relative;
    overflow: hidden;
  }

  .video-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-thumb svg {
    position: absolute;
    top: 9px;
    left: 14px;
    font-size: 20px;
    color: white;
  }

  .file-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    font-size: 20px;
    border-radius: 8px;
  }

  .file-pdf {
    color: #dc2626;
    background: #fef2f2;
  }

  .file-document {
    color: #2563eb;
    background: #eff6ff;
  }

  .file-spreadsheet {
    color: #15803d;
    background: #f0fdf4;
  }

  .file-markdown {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .file-text {
    color: #475569;
    background: #f8fafc;
  }

  .file-audio {
    color: #d97706;
    background: #fffbeb;
  }

  .file-file {
    color: #64748b;
    background: #f1f5f9;
  }

  .digital-profile {
    padding: 18px;
    margin-bottom: 20px;
    background: var(--art-gray-100);
    border-radius: 12px;
  }

  .digital-profile .el-image {
    width: 96px;
    height: 96px;
    border-radius: 12px;
  }

  .digital-profile h3 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .digital-profile p {
    margin: 0;
    color: var(--art-text-gray-500);
  }

  .preview-meta {
    margin-bottom: 16px;
  }

  .preview-box {
    min-height: 360px;
    padding: 18px;
    overflow: auto;
    background: var(--art-gray-100);
    border-radius: 10px;
  }

  .preview-box .el-image,
  .preview-box video,
  .preview-box iframe {
    width: 100%;
    height: 420px;
  }

  .preview-box audio {
    width: 100%;
    margin-top: 140px;
  }

  .text-preview {
    line-height: 1.9;
    white-space: pre-wrap;
  }

  @media (width <= 900px) {
    .resource-layout {
      display: block;
    }

    .directory-card {
      margin-bottom: 16px;
    }

    .summary-row > div {
      margin-bottom: 12px;
    }

    .resource-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .resource-search {
      width: 100%;
    }
  }
</style>
<style scoped>
  :global(.resource-dialog) {
    display: flex;
    flex-direction: column;
    height: min(900px, 92vh);
    height: min(900px, 92dvh);
    overflow: hidden;
  }

  :global(.resource-dialog .el-dialog__body) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  :global(.resource-dialog .el-dialog__header),
  :global(.resource-dialog .el-dialog__footer) {
    flex-shrink: 0;
  }

  :global(.resource-preview-dialog .el-dialog__body) {
    display: flex;
    flex-direction: column;
  }

  :global(.resource-preview-dialog .preview-meta) {
    flex-shrink: 0;
  }

  :global(.resource-preview-dialog .preview-box) {
    flex: 1;
    min-height: 0;
  }

  :global(.resource-editor-dialog .markdown-editor),
  :global(.resource-editor-dialog .markdown-editor .milkdown) {
    min-height: clamp(360px, 52vh, 640px);
  }

  .knowledge-detail-page {
    height: 100%;
    min-height: 0;
  }

  .knowledge-content-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .knowledge-content-card > :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 20px 22px 24px;
  }

  .knowledge-content-card :deep(.el-tabs) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .knowledge-content-card :deep(.el-tabs__content),
  .knowledge-content-card :deep(.el-tab-pane) {
    flex: 1;
    min-height: 0;
  }

  .knowledge-heading,
  .knowledge-content-card :deep(.el-tabs__header) {
    flex-shrink: 0;
  }

  .knowledge-content-card :deep(.el-tabs__content) {
    overflow: hidden;
  }

  .knowledge-content-card :deep(.el-tab-pane) {
    height: 100%;
    overflow: auto;
  }

  .resource-layout {
    gap: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .directory-card {
    display: flex;
    flex: 0 0 min(var(--directory-width), 45%);
    flex-direction: column;
    min-width: 230px;
    height: 100%;
    min-height: 0;
    transition-property: background-color, border-color, box-shadow !important;
  }

  .is-resizing .directory-card,
  .is-resizing .resource-main {
    transition: none !important;
  }

  .directory-card > :deep(.el-card__header) {
    flex-shrink: 0;
    padding: 14px 12px;
  }

  .directory-card > :deep(.el-card__body) {
    display: block;
    flex: 1;
    min-height: 0;
    padding: 10px 8px;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .directory-resizer {
    display: flex;
    flex: 0 0 16px;
    align-items: center;
    justify-content: center;
    touch-action: none;
    cursor: col-resize;
    outline: none;
  }

  .directory-resizer::after {
    width: 3px;
    height: 40px;
    content: '';
    background: var(--el-border-color);
    border-radius: 3px;
    transition: background-color 150ms;
  }

  .directory-resizer:hover::after,
  .directory-resizer:focus-visible::after,
  .is-resizing .directory-resizer::after {
    background: var(--el-color-primary);
  }

  .is-resizing,
  .is-resizing * {
    cursor: col-resize !important;
    user-select: none;
  }

  .resource-main {
    height: 100%;
    min-height: 0;
    overflow: auto;
  }

  @media (width <= 900px) {
    .resource-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: auto;
    }

    .directory-card {
      flex: 0 0 280px;
      width: 100%;
      min-height: 0;
      margin-bottom: 0;
    }

    .directory-resizer {
      display: none;
    }

    .resource-main {
      flex: 1 0 320px;
      height: auto;
    }
  }

  .directory-card :deep(.el-tree-node__content) {
    align-items: flex-start;
    height: auto;
    min-height: 32px;
  }

  .directory-card :deep(.el-tree-node__expand-icon) {
    margin-top: 4px;
  }

  .directory-drop-zone {
    position: relative;
    flex: 1;
    min-width: 0;
    border-radius: 6px;
    transition:
      background-color 180ms ease,
      box-shadow 180ms ease;
  }

  .directory-card :deep(.el-tree-node.is-drop-inner > .el-tree-node__content .directory-drop-zone) {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    box-shadow: inset 0 0 0 1px var(--el-color-primary-light-5);
  }

  .tree-node > span {
    min-width: 0;
  }

  .tree-node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tree-node small {
    flex-shrink: 0;
  }

  .tree-node > .directory-node-actions {
    flex-shrink: 0;
    gap: 2px;
    margin-left: 4px;
  }

  .directory-menu-button {
    width: 24px;
    height: 28px;
  }

  .directory-header > span {
    display: flex;
    gap: 8px;
  }

  .directory-header .el-button + .el-button {
    margin-left: 0;
  }

  .directory-drop-zone .tree-node {
    min-height: 32px;
  }

  .directory-drop-zone.is-drop-target {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    box-shadow: inset 0 0 0 1px var(--el-color-primary-light-5);
  }

  /* Use the tree's actual drop indicator; overlays never change the drag hit areas. */
  .directory-card :deep(.el-tree__drop-indicator) {
    right: 4px;
    z-index: 4;
    height: 8px;
    margin-top: -4px;
    pointer-events: none;
    background: var(--el-color-primary-light-8);
    border: 1px dashed var(--el-color-primary);
    border-radius: 4px;
    animation: directory-insertion-appear 130ms ease-out;
  }

  .directory-card :deep(.el-tree__drop-indicator)::before {
    position: absolute;
    top: 1px;
    left: -4px;
    width: 4px;
    height: 4px;
    content: '';
    background: var(--el-color-primary);
    border-radius: 50%;
  }

  .directory-drop-zone.is-drag-source {
    outline: 1px dashed var(--el-border-color-darker);
    outline-offset: -1px;
    opacity: 0.4;
  }

  .directory-drop-zone.is-drop-target::after,
  .directory-card
    :deep(.el-tree-node.is-drop-inner > .el-tree-node__content .directory-drop-zone)::after {
    position: absolute;
    inset: 1px;
    pointer-events: none;
    content: '';
    border: 1px dashed var(--el-color-primary);
    border-radius: 5px;
    animation: directory-target-appear 160ms ease-out;
  }

  .directory-drop-zone.is-drop-landed {
    animation: directory-drop-land 480ms ease-out;
  }

  @keyframes directory-insertion-appear {
    from {
      opacity: 0;
      transform: scaleX(0.92);
    }

    to {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  @keyframes directory-target-appear {
    from {
      opacity: 0;
      transform: scale(0.98);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes directory-drop-land {
    from {
      background: var(--el-color-primary-light-7);
      box-shadow: inset 0 0 0 1px var(--el-color-primary);
    }

    to {
      background: transparent;
      box-shadow: inset 0 0 0 1px transparent;
    }
  }

  :deep(.resource-drag-placeholder) {
    opacity: 0.45;
  }

  :deep(.resource-drag-placeholder > td) {
    background: var(--el-color-primary-light-9) !important;
    border-top: 1px dashed var(--el-color-primary);
    border-bottom: 1px dashed var(--el-color-primary);
  }

  :deep(.resource-drag-chosen) {
    cursor: grabbing;
  }

  @media (prefers-reduced-motion: reduce) {
    .directory-drop-zone {
      transition: none;
    }

    .directory-drop-zone,
    .directory-drop-zone::after,
    .directory-card :deep(.el-tree__drop-indicator),
    .directory-card
      :deep(.el-tree-node.is-drop-inner > .el-tree-node__content .directory-drop-zone)::after {
      animation: none !important;
    }
  }

  .resource-filters,
  .resource-batch {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .resource-batch {
    padding: 8px;
    margin: 10px 0;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  .resource-toolbar {
    flex-wrap: wrap;
  }

  .resource-drag-handle {
    color: var(--art-text-gray-400);
    cursor: move;
  }
</style>
