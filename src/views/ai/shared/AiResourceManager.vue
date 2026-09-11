<template>
  <div class="art-full-height">
    <template v-if="kind !== 'knowledge' || !detailRow">
    <ElRow :gutter="16" class="summary-row">
      <ElCol v-for="card in summary" :key="card.label" :xs="12" :sm="6">
        <ElCard shadow="never" class="summary-card">
          <ArtSvgIcon :icon="card.icon" class="summary-icon" />
          <div><strong>{{ card.value }}</strong><span>{{ card.label }}</span></div>
        </ElCard>
      </ElCol>
    </ElRow>
    <ArtSearchBar v-model="search" :items="searchItems" @search="applySearch" @reset="resetSearch" />
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refresh">
        <template #left>
          <ElButton type="primary" v-ripple @click="openEditor()">{{ labels.add }}</ElButton>
          <ElButton v-if="kind === 'knowledge'" v-ripple @click="notifyImport">导入文档</ElButton>
        </template>
      </ArtTableHeader>
      <ArtTable :loading="loading" :data="pageRows" :columns="columns" :pagination="pagination"
        :empty-text="hasSearch ? '没有匹配结果，请调整筛选条件' : labels.empty"
        @pagination:size-change="changeSize" @pagination:current-change="changePage" />
    </ElCard>
    </template>

    <ElDialog v-model="editorVisible" :title="editingId ? labels.edit : labels.add" width="720px" align-center :close-on-click-modal="false">
      <ElAlert :title="labels.tip" type="info" :closable="false" show-icon class="editor-tip" />
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="104px">
        <ElFormItem :label="nameLabel" prop="name"><ElInput v-model="form.name" maxlength="60" /></ElFormItem>
        <template v-if="kind === 'knowledge'">
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="所属主题" prop="theme"><ElSelect v-model="form.theme" class="!w-full"><ElOption v-for="v in ['古代中国','青铜文明','瓷器艺术']" :key="v" :label="v" :value="v" /></ElSelect></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="向量模型" prop="embedding"><ElSelect v-model="form.embedding" class="!w-full"><ElOption label="text-embedding-3-small" value="text-embedding-3-small"/><ElOption label="bge-m3" value="bge-m3"/></ElSelect></ElFormItem></ElCol></ElRow>
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="分段长度"><ElInputNumber v-model="form.chunkSize" :min="100" :max="4000" :step="100" class="!w-full" /></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="重叠长度"><ElInputNumber v-model="form.overlap" :min="0" :max="1000" :step="20" class="!w-full" /></ElFormItem></ElCol></ElRow>
        </template>
        <template v-else-if="kind === 'prompt'">
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="应用场景" prop="scene"><ElSelect v-model="form.scene" class="!w-full"><ElOption v-for="v in ['知识问答','文物讲解','安全审核']" :key="v" :label="v" :value="v" /></ElSelect></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="版本号" prop="version"><ElInput v-model="form.version" /></ElFormItem></ElCol></ElRow>
          <ElFormItem label="模板内容" prop="content"><ElInput v-model="form.content" type="textarea" :rows="9" maxlength="4000" show-word-limit placeholder="可使用双花括号变量，例如 question、context" /></ElFormItem>
          <ElFormItem label="模板变量"><ElInput v-model="form.variables" placeholder="多个变量用英文逗号分隔" /></ElFormItem>
        </template>
        <template v-else-if="kind === 'script'">
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="话术类型" prop="category"><ElSelect v-model="form.category" class="!w-full"><ElOption v-for="v in scriptTypes" :key="v" :label="v" :value="v" /></ElSelect></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="适用数字人"><ElSelect v-model="form.digitalHuman" class="!w-full"><ElOption v-for="v in ['全部数字人','央央','文博老师']" :key="v" :label="v" :value="v" /></ElSelect></ElFormItem></ElCol></ElRow>
          <ElFormItem label="话术内容" prop="content"><ElInput v-model="form.content" type="textarea" :rows="7" maxlength="500" show-word-limit /></ElFormItem>
          <ElFormItem label="触发说明"><ElInput v-model="form.trigger" maxlength="200" /></ElFormItem>
        </template>
        <template v-else>
          <ElFormItem label="形象缩略图">
            <div class="avatar-picker"><ElAvatar :src="form.avatar" shape="square" :size="72" /><ElRadioGroup v-model="form.avatar"><ElRadioButton :value="avatar1">形象一</ElRadioButton><ElRadioButton :value="avatar2">形象二</ElRadioButton><ElRadioButton :value="avatar3">形象三</ElRadioButton></ElRadioGroup><ElButton @click="notifyAvatarUpload">上传图片</ElButton></div>
          </ElFormItem>
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="角色类型" prop="role"><ElSelect v-model="form.role" class="!w-full"><ElOption v-for="v in ['博物馆讲解员','历史人物','课堂助教']" :key="v" :label="v" :value="v" /></ElSelect></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="绑定知识库" prop="knowledge"><ElSelect v-model="form.knowledge" class="!w-full"><ElOption label="古代中国知识库" value="古代中国知识库"/><ElOption label="青铜文明知识库" value="青铜文明知识库"/></ElSelect></ElFormItem></ElCol></ElRow>
          <ElRow :gutter="16"><ElCol :span="12"><ElFormItem label="提示词模板" prop="prompt"><ElSelect v-model="form.prompt" class="!w-full"><ElOption label="学生问答 V1.2" value="学生问答 V1.2"/><ElOption label="文物讲解 V1.0" value="文物讲解 V1.0"/></ElSelect></ElFormItem></ElCol><ElCol :span="12"><ElFormItem label="欢迎话术"><ElSelect v-model="form.welcome" class="!w-full"><ElOption label="通用欢迎语" value="通用欢迎语"/><ElOption label="青铜主题欢迎语" value="青铜主题欢迎语"/></ElSelect></ElFormItem></ElCol></ElRow>
          <ElFormItem label="角色说明"><ElInput v-model="form.description" type="textarea" :rows="4" maxlength="300" show-word-limit /></ElFormItem>
        </template>
        <ElFormItem label="启用状态"><ElSwitch v-model="form.status" active-value="enabled" inactive-value="disabled" /></ElFormItem>
        <ElFormItem label="备注"><ElInput v-model="form.remark" type="textarea" :rows="2" maxlength="200" /></ElFormItem>
      </ElForm>
      <template #footer><ElButton @click="editorVisible=false">取消</ElButton><ElButton type="primary" :loading="saving" @click="save">保存</ElButton></template>
    </ElDialog>

    <component :is="kind === 'knowledge' ? 'section' : ElDrawer" v-if="kind !== 'knowledge' || detailRow" v-model="detailVisible" :title="labels.detail" size="560px" :class="{'knowledge-detail-page':kind==='knowledge'}">
      <template v-if="detailRow">
        <ElCard v-if="kind === 'knowledge'" shadow="never" class="knowledge-content-card">
        <header class="knowledge-heading"><div><h1>{{ detailRow.name }}</h1><p>管理目录、文件预览、解析与向量化状态。</p></div><ElButton @click="closeKnowledgeDetail"><ArtSvgIcon icon="ri:arrow-left-line" />返回知识库</ElButton></header>
        <ElTabs v-model="knowledgeTab">
          <ElTabPane label="知识库概览" name="overview">
            <ElDescriptions :column="2" border><ElDescriptionsItem v-for="item in details" :key="item.label" :label="item.label">{{ item.value || '-' }}</ElDescriptionsItem></ElDescriptions>
          </ElTabPane>
          <ElTabPane label="知识资源" name="resources">
            <div class="resource-layout">
              <ElCard shadow="never" class="directory-card">
                <template #header><div class="directory-header"><b>资源目录</b><span><ElButton link type="primary" @click="addDirectory">新增子目录</ElButton><ElDropdown trigger="click"><ElButton link><ArtSvgIcon icon="ri:more-2-fill"/></ElButton><template #dropdown><ElDropdownMenu><ElDropdownItem @click="renameDirectory">重命名</ElDropdownItem><ElDropdownItem divided @click="deleteDirectory">删除目录</ElDropdownItem></ElDropdownMenu></template></ElDropdown></span></div></template>
                <ElTree :data="directoryTree" node-key="id" default-expand-all highlight-current draggable :allow-drop="allowDirectoryDrop" :current-node-key="selectedDirectory" @node-click="selectDirectory">
                  <template #default="{data}"><span class="tree-node" @dragover.prevent @drop.stop="dropResourceToDirectory(data)"><span><ArtSvgIcon icon="ri:folder-3-line" /> {{ data.label }}</span><small>{{ directoryCount(data.id) }}</small></span></template>
                </ElTree>
              </ElCard>
              <div class="resource-main">
                <div class="resource-toolbar">
                  <div><ElButton type="primary" @click="openResourceEditor()">录入文本</ElButton><ElButton @click="notifyImport">上传文件</ElButton><ArtExcelImport @import-success="importExcel" @import-error="importExcelError"><template #import-text>导入 Excel</template></ArtExcelImport></div>
                  <ElInput v-model="resourceKeyword" clearable placeholder="搜索当前目录" class="resource-search" />
                </div>
                <VueDraggable v-model="displayedResources" target="tbody" handle=".resource-drag-handle" :animation="150">
                <ElTable :data="displayedResources" border>
                  <ElTableColumn width="44"><template #default="{row}"><span class="resource-drag-handle" draggable="true" @dragstart="startResourceDrag(row)"><ArtSvgIcon icon="ri:draggable"/></span></template></ElTableColumn>
                  <ElTableColumn label="资源" min-width="240"><template #default="{row}"><div class="resource-name"><ElImage v-if="row.type==='image'" class="resource-thumb" :src="row.preview" fit="cover"/><div v-else-if="row.type==='video'" class="resource-thumb video-thumb"><img :src="cover1"/><ArtSvgIcon icon="ri:play-circle-fill"/></div><span v-else class="file-icon" :class="`file-${row.type}`"><ArtSvgIcon :icon="resourceIcon(row.type)" /></span><div><b>{{ row.name }}</b><small>{{ row.size }}</small></div></div></template></ElTableColumn>
                  <ElTableColumn prop="type" label="类型" width="100"><template #default="{row}"><ElTag effect="plain">{{ resourceTypeName(row.type) }}</ElTag></template></ElTableColumn>
                  <ElTableColumn prop="parseStatus" label="解析/向量化" width="130"><template #default="{row}"><ElTag :type="parseTag(row.parseStatus)">{{ row.parseStatus }}</ElTag><small class="vector-state">{{ row.parseStatus==='已完成'?'已向量化':'未向量化' }}</small></template></ElTableColumn>
                  <ElTableColumn prop="chunks" label="分段数" width="85" /><ElTableColumn prop="createdAt" label="创建时间" width="155" /><ElTableColumn prop="updatedAt" label="更新时间" width="155" /><ElTableColumn prop="parsedAt" label="最后解析" width="155" />
                  <ElTableColumn label="操作" width="150" fixed="right"><template #default="{row}"><ElButton link type="primary" @click="previewResource(row)">预览</ElButton><ElButton link :type="row.status==='enabled'?'warning':'success'" @click="toggleResource(row)">{{ row.status==='enabled'?'停用':'启用' }}</ElButton><ElButton link type="danger" :disabled="row.status==='enabled'" @click="removeResource(row)">删除</ElButton></template></ElTableColumn>
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
            <div><h3>{{ detailRow.name }}</h3><p>{{ detailRow.description }}</p></div>
          </div>
          <ElDescriptions :column="1" border><ElDescriptionsItem v-for="item in details" :key="item.label" :label="item.label">{{ item.value || '-' }}</ElDescriptionsItem></ElDescriptions>
          <ElDivider content-position="left">内容与说明</ElDivider>
          <div class="detail-content">{{ detailRow.content || detailRow.description || detailRow.remark || '暂无说明' }}</div>
          <div v-if="kind === 'prompt' || kind === 'script'" class="detail-actions"><ElButton type="primary" @click="openTest">模拟测试</ElButton><ElButton @click="copyRow(detailRow)">复制为新版本</ElButton></div>
        </template>
      </template>
    </component>

    <ElDialog v-model="resourcePreviewVisible" title="资源预览" width="760px" align-center>
      <template v-if="currentResource">
        <ElDescriptions :column="3" border class="preview-meta"><ElDescriptionsItem label="资源名称" :span="2">{{ currentResource.name }}</ElDescriptionsItem><ElDescriptionsItem label="类型">{{ resourceTypeName(currentResource.type) }}</ElDescriptionsItem></ElDescriptions>
        <div class="preview-box">
          <ArtCutterImg v-if="currentResource.type === 'image'" v-model:img-url="currentResource.preview" :box-width="650" :box-height="360" :cut-width="480" :cut-height="270" :quality="1" :tool="true" :show-preview="true" title="图片预览与裁剪" preview-title="裁剪结果" @error="cropError" />
          <ArtVideoPlayer v-else-if="currentResource.type === 'video'" player-id="knowledge-video-preview" :video-url="currentResource.preview || sampleVideo" :poster-url="cover1" :autoplay="false" :playback-rates="[0.5,1,1.5,2]" />
          <audio v-else-if="currentResource.type === 'audio'" :src="currentResource.preview" controls />
          <PdfPreview v-else-if="currentResource.type === 'pdf'" :src="currentResource.preview || ''" />
          <DocxPreview v-else-if="currentResource.type === 'document'" :src="currentResource.preview || ''" :fallback="currentResource.content" />
          <ArtTable v-else-if="currentResource.type === 'spreadsheet'" :data="spreadsheetPreview"><ElTableColumn v-for="key in Object.keys(spreadsheetPreview[0] || {})" :key="key" :prop="key" :label="key" /></ArtTable>
          <MarkdownEditor v-else-if="currentResource.type === 'markdown'" v-model="currentResource.content" />
          <div v-else class="text-preview">{{ currentResource.content || '该文件已完成解析。接入文件服务后将在此展示原文和分段结果。' }}</div>
        </div>
      </template>
      <template #footer><ElButton @click="resourcePreviewVisible=false">关闭</ElButton><ElButton @click="downloadResource(currentResource!)">下载</ElButton><ElButton @click="replaceResource(currentResource!)">替换文件</ElButton><ElButton type="primary" @click="editFromPreview">编辑</ElButton></template>
    </ElDialog>

    <ElDialog v-model="resourceEditorVisible" :title="resourceForm.id ? '编辑知识资源' : '录入文本资源'" width="660px" align-center>
      <ElForm :model="resourceForm" label-width="90px"><ElFormItem label="资源名称"><ElInput v-model="resourceForm.name" /></ElFormItem><ElFormItem label="资源类型"><ElSelect v-model="resourceForm.type" class="!w-full" :disabled="Boolean(resourceForm.id)"><ElOption v-for="t in resourceTypes" :key="t.value" :label="t.label" :value="t.value" /></ElSelect></ElFormItem><ElFormItem label="资源内容"><MarkdownEditor v-if="resourceForm.type==='markdown'" v-model="resourceEditorContent"/><ElInput v-else v-model="resourceForm.content" type="textarea" :rows="9" maxlength="6000" show-word-limit placeholder="输入知识正文、摘要或文件说明" /></ElFormItem><ElFormItem label="标签"><ElInput v-model="resourceForm.tags" placeholder="多个标签使用逗号分隔" /></ElFormItem></ElForm>
      <template #footer><ElButton @click="resourceEditorVisible=false">取消</ElButton><ElButton type="primary" @click="saveResource">保存并解析</ElButton></template>
    </ElDialog>

    <ElDialog v-model="testVisible" title="内容模拟测试" width="680px" align-center>
      <ElAlert title="当前为页面交互演示，不会调用真实模型。" type="warning" :closable="false" show-icon class="editor-tip" />
      <ElForm label-width="86px"><ElFormItem label="测试输入"><ElInput v-model="testInput" type="textarea" :rows="4" placeholder="输入一个学生问题或触发场景" /></ElFormItem><ElFormItem label="模拟结果"><div class="test-result">{{ testResult || '点击“运行测试”查看模板或话术的模拟结果。' }}</div></ElFormItem></ElForm>
      <template #footer><ElButton @click="testVisible=false">关闭</ElButton><ElButton type="primary" @click="runTest">运行测试</ElButton></template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElAvatar, ElDrawer, ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
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
  type Kind = 'knowledge' | 'prompt' | 'script' | 'digital'
  type Row = Record<string, any> & { id:number; name:string; status:'enabled'|'disabled'; updatedAt:string }
  const props = defineProps<{kind:Kind}>(); const { kind } = toRefs(props)
  const labelsByKind = {
    knowledge:{add:'新建知识库',edit:'编辑知识库',detail:'知识库详情',empty:'尚未创建知识库',tip:'当前维护展示配置；文档解析与向量索引将在后端接入后生效。'},
    prompt:{add:'新建提示词模板',edit:'编辑提示词模板',detail:'模板详情',empty:'尚未创建提示词模板',tip:'建议先保存为停用状态，测试通过后再启用。'},
    script:{add:'新建话术',edit:'编辑话术',detail:'话术详情',empty:'尚未配置欢迎语或兜底话术',tip:'兜底话术应明确友好，不应补充未经知识库验证的事实。'},
    digital:{add:'新建数字人',edit:'编辑数字人',detail:'数字人详情',empty:'尚未创建数字人',tip:'在这里绑定知识库、提示词与欢迎话术；形象和声音后续单独配置。'}
  }; const labels = computed(()=>labelsByKind[kind.value]); const nameLabel=computed(()=>({knowledge:'知识库名称',prompt:'模板名称',script:'话术名称',digital:'数字人名称'}[kind.value]))
  const at='2026-09-11 10:30:00'; const seeds:Record<Kind,Row[]>={
    knowledge:[{id:1,name:'古代中国知识库',theme:'古代中国',embedding:'text-embedding-3-small',documents:126,chunks:2380,chunkSize:800,overlap:120,status:'enabled',updatedAt:at,remark:'学生端默认知识来源'},{id:2,name:'青铜文明知识库',theme:'青铜文明',embedding:'bge-m3',documents:48,chunks:912,chunkSize:600,overlap:100,status:'enabled',updatedAt:'2026-09-09 15:20:00',remark:'青铜器专题资料'},{id:3,name:'瓷器艺术草稿库',theme:'瓷器艺术',embedding:'bge-m3',documents:15,chunks:206,chunkSize:600,overlap:80,status:'disabled',updatedAt:'2026-09-08 09:10:00',remark:'等待内容审核'}],
    prompt:[{id:1,name:'学生问答系统提示词',scene:'知识问答',version:'V1.2',variables:'question, context, ageGroup',content:'你是面向学生的博物馆数字讲解员。请仅根据 context 回答 question，资料不足时不得猜测。',status:'enabled',updatedAt:at,remark:'生产使用版本'},{id:2,name:'文物讲解提示词',scene:'文物讲解',version:'V1.0',variables:'artifact, context',content:'根据资料，用生动准确的语言介绍文物，并给出一个思考问题。',status:'enabled',updatedAt:'2026-09-10 16:00:00',remark:''},{id:3,name:'回答安全审核',scene:'安全审核',version:'V0.8',variables:'answer, ageGroup',content:'检查回答是否准确、安全且适龄。',status:'disabled',updatedAt:'2026-09-06 11:20:00',remark:'测试中'}],
    script:[{id:1,name:'通用欢迎语',category:'欢迎语',digitalHuman:'全部数字人',content:'你好，我是你的数字讲解员。今天想了解哪一件文物呢？',trigger:'进入数字人页面后首次播放',status:'enabled',updatedAt:at,remark:''},{id:2,name:'无知识兜底',category:'无知识兜底',digitalHuman:'全部数字人',content:'这个问题我暂时没有找到可靠资料。你可以换个问法，或者选择一个推荐问题。',trigger:'检索结果低于可信阈值时',status:'enabled',updatedAt:'2026-09-10 13:40:00',remark:'禁止自行补充事实'},{id:3,name:'服务繁忙兜底',category:'服务异常兜底',digitalHuman:'全部数字人',content:'我现在需要休息一下，请稍后再试。',trigger:'模型超时或服务不可用时',status:'enabled',updatedAt:'2026-09-09 18:05:00',remark:''}],
    digital:[{id:1,name:'央央',avatar:avatar1,role:'博物馆讲解员',knowledge:'古代中国知识库',prompt:'学生问答 V1.2',welcome:'通用欢迎语',sessions:1286,description:'亲切、活泼的校园博物馆数字讲解员。',status:'enabled',updatedAt:at,remark:'默认数字人'},{id:2,name:'文博老师',avatar:avatar2,role:'课堂助教',knowledge:'青铜文明知识库',prompt:'文物讲解 V1.0',welcome:'青铜主题欢迎语',sessions:368,description:'沉稳专业，适用于课堂专题讲解。',status:'enabled',updatedAt:'2026-09-10 09:20:00',remark:''},{id:3,name:'青铜小使者',avatar:avatar3,role:'历史人物',knowledge:'青铜文明知识库',prompt:'学生问答 V1.2',welcome:'青铜主题欢迎语',sessions:0,description:'青铜文明专题角色，形象资产制作中。',status:'disabled',updatedAt:'2026-09-08 14:00:00',remark:'未发布'}]
  }
  const rows=ref<Row[]>(structuredClone(seeds[kind.value])); const search=ref<Record<string,any>>({}); const applied=ref<Record<string,any>>({}); const loading=ref(false); const saving=ref(false); const editorVisible=ref(false); const detailVisible=ref(false); const editingId=ref<number>(); const detailRow=ref<Row>(); const form=reactive<Record<string,any>>({}); const formRef=ref<FormInstance>(); const pagination=reactive({current:1,size:20,total:0}); const scriptTypes=['欢迎语','无知识兜底','服务异常兜底','敏感问题兜底']
  type Resource={id:number;name:string;type:string;directory:string;size:string;status?:'enabled'|'disabled';parseStatus:string;chunks:number;createdAt?:string;updatedAt:string;parsedAt?:string;content:string;preview?:string;tags?:string}
  const resources=ref<Resource[]>([
    {id:1,name:'古代中国通史导读.txt',type:'text',directory:'overview',size:'18 KB',parseStatus:'已完成',chunks:24,updatedAt:'2026-09-11 09:20',content:'古代中国展览以王朝更替和文明发展为线索，展示中华文明绵延不断的发展历程。',tags:'历史,通史'},
    {id:2,name:'青铜器知识手册.docx',type:'document',directory:'bronze',size:'2.6 MB',parseStatus:'已完成',chunks:86,updatedAt:'2026-09-10 16:32',content:'已提取文档正文、标题层级和图片说明。',tags:'青铜器'},
    {id:3,name:'文物讲解审核稿.pdf',type:'pdf',directory:'review',size:'8.4 MB',parseStatus:'已完成',chunks:132,updatedAt:'2026-09-10 14:05',content:'PDF 共 56 页，已完成版面解析。',tags:'审核资料'},
    {id:4,name:'后母戊鼎.jpg',type:'image',directory:'bronze',size:'3.1 MB',parseStatus:'已完成',chunks:3,updatedAt:'2026-09-09 11:18',preview:cover1,content:'OCR 与图片描述：后母戊鼎器形厚重，纹饰精美。',tags:'藏品,图片'},
    {id:5,name:'青铜文明宣传片.mp4',type:'video',directory:'media',size:'126 MB · 04:32',parseStatus:'解析中',chunks:0,updatedAt:'2026-09-09 10:20',content:'正在提取音轨、字幕和关键帧。',tags:'视频'},
    {id:6,name:'讲解员示范音频.mp3',type:'audio',directory:'media',size:'12 MB · 06:10',parseStatus:'解析失败',chunks:0,updatedAt:'2026-09-08 17:42',content:'音轨编码暂不支持，请转为 MP3/AAC 后重试。',tags:'音频'},
    {id:7,name:'展览资料附件.zip',type:'file',directory:'attachments',size:'48 MB',parseStatus:'不参与解析',chunks:0,updatedAt:'2026-09-08 15:30',content:'附件仅供下载，不参与知识检索。',tags:'附件'},
    {id:8,name:'藏品基础数据.xlsx',type:'spreadsheet',directory:'overview',size:'680 KB',parseStatus:'已完成',chunks:52,updatedAt:'2026-09-08 13:10',content:'Excel 共 126 行藏品数据。',tags:'表格,藏品'},
    {id:9,name:'学生讲解规范.md',type:'markdown',directory:'review',size:'12 KB',parseStatus:'已完成',chunks:18,updatedAt:'2026-09-08 12:00',content:'# 学生讲解规范\n\n回答应当**准确、友好、适龄**，并且只引用已审核的知识资料。',tags:'规范,Markdown'}
  ])
  resources.value.forEach(r=>Object.assign(r,{status:r.status||'enabled',createdAt:r.createdAt||r.updatedAt,parsedAt:r.parsedAt||(r.parseStatus==='已完成'?r.updatedAt:'-')}))
  const resourceTypes=[{label:'纯文本',value:'text'},{label:'Markdown',value:'markdown'},{label:'Word 文档',value:'document'},{label:'PDF',value:'pdf'},{label:'图片',value:'image'},{label:'视频',value:'video'},{label:'音频',value:'audio'},{label:'Excel',value:'spreadsheet'},{label:'其他文件',value:'file'}]
  const knowledgeTab=ref('overview'),resourceKeyword=ref(''),resourcePreviewVisible=ref(false),resourceEditorVisible=ref(false),currentResource=ref<Resource>(); const resourceForm=reactive<Partial<Resource>>({}); const testVisible=ref(false),testInput=ref(''),testResult=ref('')
  const resourceEditorContent=computed({get:()=>resourceForm.content||'',set:(value:string)=>{resourceForm.content=value}})
  type Directory={id:string;label:string;children?:Directory[]}; const directoryTree=ref<Directory[]>([{id:'all',label:'全部资源',children:[{id:'overview',label:'基础资料'},{id:'bronze',label:'青铜文明'},{id:'review',label:'审核资料'},{id:'media',label:'音视频素材'},{id:'attachments',label:'附件'}]}]); const selectedDirectory=ref('all'); const spreadsheetPreview=ref<Record<string,unknown>[]>([{藏品名称:'后母戊鼎',年代:'商代',类别:'青铜器'},{藏品名称:'四羊方尊',年代:'商代晚期',类别:'青铜器'}]); const sampleVideo='//lf3-static.bytednsdoc.com/obj/eden-cn/nupenuvpxnuvo/xgplayer_doc/xgplayer-demo.mp4'
  const rules:FormRules={name:[{required:true,message:'请输入名称',trigger:'blur'}],theme:[{required:true,message:'请选择主题',trigger:'change'}],embedding:[{required:true,message:'请选择向量模型',trigger:'change'}],scene:[{required:true,message:'请选择场景',trigger:'change'}],version:[{required:true,message:'请输入版本',trigger:'blur'}],category:[{required:true,message:'请选择类型',trigger:'change'}],role:[{required:true,message:'请选择角色',trigger:'change'}],knowledge:[{required:true,message:'请选择知识库',trigger:'change'}],prompt:[{required:true,message:'请选择提示词',trigger:'change'}],content:[{required:true,message:'请输入内容',trigger:'blur'}]}
  const searchItems=[{key:'keyword',label:'关键词',type:'input',props:{clearable:true,placeholder:'搜索名称或内容'}},{key:'status',label:'状态',type:'select',props:{clearable:true,placeholder:'全部状态',options:[{label:'启用',value:'enabled'},{label:'停用',value:'disabled'}]}}]
  const filtered=computed(()=>rows.value.filter(r=>(!applied.value.keyword||JSON.stringify(r).toLowerCase().includes(String(applied.value.keyword).toLowerCase()))&&(!applied.value.status||r.status===applied.value.status))); const pageRows=computed(()=>filtered.value.slice((pagination.current-1)*pagination.size,pagination.current*pagination.size)); const hasSearch=computed(()=>Object.keys(applied.value).length>0); watch(filtered,v=>{pagination.total=v.length},{immediate:true})
  const summary=computed(()=>[{label:'配置总数',value:rows.value.length,icon:kind.value==='digital'?'ri:user-smile-line':'ri:database-2-line'},{label:'已启用',value:rows.value.filter(r=>r.status==='enabled').length,icon:'ri:checkbox-circle-line'},{label:'待配置/停用',value:rows.value.filter(r=>r.status==='disabled').length,icon:'ri:time-line'},{label:kind.value==='knowledge'?'文档总数':kind.value==='digital'?'累计会话':'内容条目',value:kind.value==='knowledge'?rows.value.reduce((n,r)=>n+(r.documents||0),0):kind.value==='digital'?rows.value.reduce((n,r)=>n+(r.sessions||0),0).toLocaleString():rows.value.length,icon:'ri:bar-chart-box-line'}])
  const statusCol={prop:'status',label:'状态',width:90,formatter:(r:Row)=>h(ElTag,{type:r.status==='enabled'?'success':'info'},()=>r.status==='enabled'?'启用':'停用')}; const opCol={prop:'operation',label:'操作',width:170,fixed:'right' as const,disabled:true,formatter:(r:Row)=>h('div',{class:'flex items-center'},[h(ArtButtonTable,{type:'view',onClick:()=>showDetail(r)}),h(ArtButtonTable,{type:'edit',onClick:()=>openEditor(r)}),h(ArtButtonTable,{type:'delete',onClick:()=>remove(r)})])}
  const {columns,columnChecks}=useTableColumns<Row>(()=>{const c:any[]=[{type:'globalIndex',label:'序号',width:70}]; if(kind.value==='digital')c.push({prop:'avatar',label:'形象',width:86,fixed:'left',formatter:(r:Row)=>h(ElAvatar,{src:r.avatar,shape:'square',size:48,onClick:()=>showDetail(r),style:'cursor:pointer'})}); c.push({prop:'name',label:'名称',minWidth:190,fixed:'left',showOverflowTooltip:true}); if(kind.value==='knowledge')c.push({prop:'theme',label:'所属主题',width:130},{prop:'embedding',label:'向量模型',minWidth:190},{prop:'documents',label:'文档数',width:90},{prop:'chunks',label:'分段数',width:90}); if(kind.value==='prompt')c.push({prop:'scene',label:'应用场景',width:120},{prop:'version',label:'版本',width:90},{prop:'variables',label:'模板变量',minWidth:180},{prop:'content',label:'内容摘要',minWidth:260,showOverflowTooltip:true}); if(kind.value==='script')c.push({prop:'category',label:'话术类型',width:140},{prop:'digitalHuman',label:'适用数字人',width:130},{prop:'content',label:'话术内容',minWidth:320,showOverflowTooltip:true}); if(kind.value==='digital')c.push({prop:'role',label:'角色类型',width:140},{prop:'knowledge',label:'绑定知识库',minWidth:180},{prop:'prompt',label:'提示词模板',minWidth:160},{prop:'welcome',label:'欢迎话术',minWidth:150},{prop:'sessions',label:'累计会话',width:100}); return [...c,statusCol,{prop:'updatedAt',label:'更新时间',width:180,formatter:(r:Row)=>formatDateTime(r.updatedAt)},opCol]})
  const blank=()=>({name:'',status:'enabled',remark:'',theme:'',embedding:'text-embedding-3-small',chunkSize:800,overlap:120,scene:'',version:'V1.0',content:'',variables:'',category:'',digitalHuman:'全部数字人',trigger:'',role:'',knowledge:'',prompt:'',welcome:'通用欢迎语',description:''})
  function applySearch(v:Record<string,any>){applied.value={...v};pagination.current=1} function resetSearch(){search.value={};applied.value={};pagination.current=1} async function refresh(){loading.value=true;await nextTick();loading.value=false;ElMessage.success('数据已刷新')} function changeSize(v:number){pagination.size=v;pagination.current=1} function changePage(v:number){pagination.current=v}
  function openEditor(r?:Row){editingId.value=r?.id;Object.assign(form,blank(),r||{},kind.value==='digital'&&!r?{avatar:avatar1}:{});editorVisible.value=true;nextTick(()=>formRef.value?.clearValidate())} async function save(){if(!formRef.value||!(await formRef.value.validate()))return;saving.value=true;const p={...form,name:String(form.name).trim(),status:(form.status === 'disabled' ? 'disabled' : 'enabled') as Row['status'],updatedAt:new Date().toISOString()};if(editingId.value){const i=rows.value.findIndex(r=>r.id===editingId.value);rows.value[i]={...rows.value[i],...p}}else rows.value.unshift({...p,id:Math.max(0,...rows.value.map(r=>r.id))+1,documents:0,chunks:0,sessions:0} as Row);await nextTick();saving.value=false;editorVisible.value=false;ElMessage.success('保存成功')}
  async function remove(r:Row){try{await ElMessageBox.confirm(`确定删除“${r.name}”吗？`,'删除确认',{type:'warning',confirmButtonText:'确定删除',cancelButtonText:'取消'});rows.value=rows.value.filter(v=>v.id!==r.id);ElMessage.success('删除成功')}catch{/* 用户取消 */}} function showDetail(r:Row){detailRow.value=r;detailVisible.value=true} function notifyImport(){ElMessage.info('上传面板支持文本、文档、PDF、图片、音频、视频和其他文件；待后端接入后执行真实上传')} function notifyAvatarUpload(){ElMessage.info('图片上传入口已预留，后续接入文件服务')}
  const titleMap:Record<string,string>={name:'名称',status:'状态',updatedAt:'更新时间',remark:'备注',theme:'所属主题',embedding:'向量模型',documents:'文档数',chunks:'分段数',scene:'应用场景',version:'版本',variables:'模板变量',category:'话术类型',digitalHuman:'适用数字人',trigger:'触发说明',role:'角色类型',knowledge:'知识库',prompt:'提示词',welcome:'欢迎话术',sessions:'累计会话'}; const details=computed(()=>detailRow.value?Object.entries(detailRow.value).filter(([k])=>!['id','content','description','chunkSize','overlap'].includes(k)).map(([k,v])=>({label:titleMap[k]||k,value:k==='status'?(v==='enabled'?'启用':'停用'):v})):[])
  const visibleResources=computed(()=>resources.value.filter(r=>(selectedDirectory.value==='all'||r.directory===selectedDirectory.value)&&(!resourceKeyword.value||r.name.toLowerCase().includes(resourceKeyword.value.toLowerCase()))))
  const displayedResources=computed({get:()=>visibleResources.value,set:(ordered:Resource[])=>{const ids=new Set(ordered.map(r=>r.id));let index=0;resources.value=resources.value.map(r=>ids.has(r.id)?ordered[index++]:r)}})
  function resourceTypeName(v:string){return resourceTypes.find(t=>t.value===v)?.label||v} function resourceIcon(v:string){return({text:'ri:file-text-line',markdown:'ri:markdown-line',document:'ri:file-word-2-line',pdf:'ri:file-pdf-2-line',image:'ri:image-line',video:'ri:video-line',audio:'ri:file-music-line',spreadsheet:'ri:file-excel-2-line',file:'ri:attachment-2'} as Record<string,string>)[v]||'ri:file-line'} function parseTag(v:string){return v==='已完成'?'success':v==='解析失败'?'danger':v==='解析中'?'warning':'info'}
  function previewResource(r:Resource){currentResource.value=r;resourcePreviewVisible.value=true} function openResourceEditor(r?:Resource){Object.assign(resourceForm,{id:undefined,name:'',type:'text',directory:selectedDirectory.value==='all'?'overview':selectedDirectory.value,content:'',tags:''},r||{});resourceEditorVisible.value=true} function saveResource(){if(!resourceForm.name?.trim())return void ElMessage.warning('请输入资源名称');if(resourceForm.id){const i=resources.value.findIndex(r=>r.id===resourceForm.id);resources.value[i]={...resources.value[i],...resourceForm,parseStatus:'等待解析',parsedAt:'-',updatedAt:'刚刚'} as Resource}else resources.value.unshift({...resourceForm,id:Math.max(0,...resources.value.map(r=>r.id))+1,size:'文本录入',status:'enabled',parseStatus:'等待解析',chunks:0,createdAt:'刚刚',updatedAt:'刚刚',parsedAt:'-'} as Resource);resourceEditorVisible.value=false;ElMessage.success('资源已保存并加入解析队列')} function reparse(r:Resource){r.parseStatus='等待解析';r.parsedAt='-';ElMessage.success('已加入重新解析队列')} async function removeResource(r:Resource){if(r.status==='enabled')return void ElMessage.warning('请先停用资源再删除');try{await ElMessageBox.confirm(`确定删除已停用资源“${r.name}”吗？`,'删除资源',{type:'warning'});resources.value=resources.value.filter(v=>v.id!==r.id);ElMessage.success('资源已删除')}catch{/* 取消 */}}
  function toggleResource(r:Resource){r.status=r.status==='enabled'?'disabled':'enabled';ElMessage.success(`资源已${r.status==='enabled'?'启用':'停用'}`)} function editFromPreview(){if(!currentResource.value)return;resourcePreviewVisible.value=false;openResourceEditor(currentResource.value)}
  function findDirectory(nodes:Directory[],id:string):Directory|undefined{for(const node of nodes){if(node.id===id)return node;const found=node.children&&findDirectory(node.children,id);if(found)return found}}
  function selectDirectory(data:Directory){selectedDirectory.value=data.id} function directoryCount(id:string){return id==='all'?resources.value.length:resources.value.filter(r=>r.directory===id).length} function addDirectory(){ElMessageBox.prompt('请输入子目录名称','新增子目录',{inputPattern:/\S+/,inputErrorMessage:'目录名称不能为空'}).then(({value})=>{const parent=findDirectory(directoryTree.value,selectedDirectory.value)||directoryTree.value[0];parent.children??=[];parent.children.push({id:`custom-${Date.now()}`,label:value,children:[]});ElMessage.success('子目录已新增，可继续在其下创建目录')}).catch(()=>undefined)} function allowDirectoryDrop(_dragging:any,drop:any,type:string){return drop.data.id!=='all'||type==='inner'}
  const draggingResource=ref<Resource>(); function startResourceDrag(r:Resource){draggingResource.value=r} function dropResourceToDirectory(dir:Directory){if(!draggingResource.value||dir.id==='all')return;draggingResource.value.directory=dir.id;draggingResource.value.updatedAt='刚刚';draggingResource.value=undefined;ElMessage.success(`资料已移动到“${dir.label}”`)}
  function renameDirectory(){const node=findDirectory(directoryTree.value,selectedDirectory.value);if(!node||node.id==='all')return void ElMessage.warning('请选择需要重命名的子目录');ElMessageBox.prompt('请输入新名称','重命名目录',{inputValue:node.label}).then(({value})=>{node.label=value;ElMessage.success('目录已重命名')}).catch(()=>undefined)}
  function removeDirectory(nodes:Directory[],id:string):boolean{const index=nodes.findIndex(n=>n.id===id);if(index>=0){nodes.splice(index,1);return true}return nodes.some(n=>n.children&&removeDirectory(n.children,id))} async function deleteDirectory(){if(selectedDirectory.value==='all')return void ElMessage.warning('根目录不能删除');if(resources.value.some(r=>r.directory===selectedDirectory.value))return void ElMessage.warning('请先移动或删除目录中的资源');try{await ElMessageBox.confirm('确定删除当前目录及其空子目录吗？','删除目录',{type:'warning'});removeDirectory(directoryTree.value,selectedDirectory.value);selectedDirectory.value='all';ElMessage.success('目录已删除')}catch{/* 取消 */}}
  function closeKnowledgeDetail(){detailRow.value=undefined;knowledgeTab.value='overview'} function downloadResource(r:Resource){const blob=new Blob([r.content||`资源：${r.name}`],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=r.preview||url;a.download=r.name;a.click();URL.revokeObjectURL(url);ElMessage.success('已开始下载')} function replaceResource(r:Resource){const input=document.createElement('input');input.type='file';input.onchange=()=>{const file=input.files?.[0];if(!file)return;r.name=file.name;r.size=`${Math.max(1,Math.round(file.size/1024))} KB`;r.preview=URL.createObjectURL(file);r.parseStatus='等待解析';r.chunks=0;r.updatedAt='刚刚';ElMessage.success('文件已替换并等待重新解析')};input.click()}
  function importExcel(data:Array<Record<string,unknown>>){spreadsheetPreview.value=data;resources.value.unshift({id:Math.max(...resources.value.map(r=>r.id))+1,name:'新导入的知识数据.xlsx',type:'spreadsheet',directory:selectedDirectory.value==='all'?'overview':selectedDirectory.value,size:`${data.length} 行`,parseStatus:'等待解析',chunks:0,updatedAt:'刚刚',content:`已读取 ${data.length} 行表格数据`});ElMessage.success(`成功导入 ${data.length} 行数据`)} function importExcelError(error:Error){ElMessage.error(`Excel 导入失败：${error.message}`)} function cropError(){ElMessage.error('图片加载或裁剪失败')}
  function openTest(){testInput.value='';testResult.value='';testVisible.value=true} function runTest(){if(!testInput.value.trim())return void ElMessage.warning('请输入测试内容');testResult.value=kind.value==='prompt'?`已套用「${detailRow.value?.name}」：系统将只依据知识库资料回答“${testInput.value}”，资料不足时触发拒答。`:`触发场景“${testInput.value}”时，数字人将回复：${detailRow.value?.content}`} function copyRow(r:Row){const copy={...r,id:Math.max(...rows.value.map(v=>v.id))+1,name:`${r.name}（副本）`,version:r.version?`${r.version}-copy`:r.version,status:'disabled' as const,updatedAt:new Date().toISOString()};rows.value.unshift(copy);detailVisible.value=false;ElMessage.success('已复制为停用的新版本')}
</script>

<style scoped lang="scss">
  .summary-row{margin-bottom:16px}.summary-card :deep(.el-card__body){display:flex;gap:14px;align-items:center;padding:18px 20px}.summary-icon{width:42px;height:42px;padding:10px;color:var(--theme-color);background:var(--art-gray-100);border-radius:12px}.summary-card strong{display:block;font-size:22px}.summary-card span{display:block;margin-top:4px;font-size:13px;color:var(--art-text-gray-500)}.editor-tip{margin-bottom:20px}.detail-content,.test-result{width:100%;padding:14px;line-height:1.8;white-space:pre-wrap;background:var(--art-gray-100);border-radius:8px}.detail-actions{margin-top:20px}.knowledge-detail-page{display:block;padding:4px 0 20px}.knowledge-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.knowledge-heading h1{margin:0;font-size:24px}.knowledge-heading p{margin:6px 0 0;color:var(--art-text-gray-500)}.avatar-picker,.resource-toolbar,.resource-name,.digital-profile{display:flex;gap:14px;align-items:center}.resource-layout{display:flex;gap:16px;min-height:560px}.directory-card{flex:0 0 230px}.directory-card :deep(.el-card__body){padding:10px 8px}.directory-header,.tree-node{display:flex;align-items:center;justify-content:space-between;width:100%}.tree-node>span{display:flex;gap:6px;align-items:center}.tree-node small{padding-right:6px;color:var(--art-text-gray-400)}.resource-main{flex:1;min-width:0}.resource-toolbar{justify-content:space-between;margin-bottom:16px}.resource-toolbar>div:first-child{display:flex;gap:8px;align-items:center}.resource-search{width:240px}.resource-name small,.vector-state{display:block;margin-top:4px;color:var(--art-text-gray-500)}.resource-thumb{width:48px;height:38px;border-radius:6px}.video-thumb{position:relative;overflow:hidden}.video-thumb img{width:100%;height:100%;object-fit:cover}.video-thumb svg{position:absolute;top:9px;left:14px;font-size:20px;color:white}.file-icon{display:grid;width:38px;height:38px;font-size:20px;border-radius:8px;place-items:center}.file-pdf{color:#dc2626;background:#fef2f2}.file-document{color:#2563eb;background:#eff6ff}.file-spreadsheet{color:#15803d;background:#f0fdf4}.file-markdown{color:#7c3aed;background:#f5f3ff}.file-text{color:#475569;background:#f8fafc}.file-audio{color:#d97706;background:#fffbeb}.file-file{color:#64748b;background:#f1f5f9}.digital-profile{padding:18px;margin-bottom:20px;background:var(--art-gray-100);border-radius:12px}.digital-profile .el-image{width:96px;height:96px;border-radius:12px}.digital-profile h3{margin:0 0 8px;font-size:22px}.digital-profile p{margin:0;color:var(--art-text-gray-500)}.preview-meta{margin-bottom:16px}.preview-box{min-height:360px;padding:18px;overflow:auto;background:var(--art-gray-100);border-radius:10px}.preview-box .el-image,.preview-box video,.preview-box iframe{width:100%;height:420px}.preview-box audio{width:100%;margin-top:140px}.text-preview{line-height:1.9;white-space:pre-wrap}@media(width <= 900px){.resource-layout{display:block}.directory-card{margin-bottom:16px}.summary-row>div{margin-bottom:12px}.resource-toolbar{align-items:stretch;flex-direction:column}.resource-search{width:100%}}
</style>
<style scoped>
  .knowledge-detail-page { height: 100%; min-height: 0; }
  .knowledge-content-card { display: flex; flex-direction: column; height: 100%; min-height: 680px; }
  .knowledge-content-card :deep(.el-card__body) { display: flex; flex: 1; flex-direction: column; min-height: 0; padding: 20px 22px 24px; }
  .knowledge-content-card :deep(.el-tabs) { display: flex; flex: 1; flex-direction: column; min-height: 0; }
  .knowledge-content-card :deep(.el-tabs__content), .knowledge-content-card :deep(.el-tab-pane) { flex: 1; min-height: 0; }
  .resource-drag-handle { color: var(--art-text-gray-400); cursor: move; }
</style>
