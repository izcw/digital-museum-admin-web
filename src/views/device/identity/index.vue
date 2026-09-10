<template>
  <div class="identity-page art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="header">
          <div>
            <h2>设备身份管理</h2>
            <p>首次注册自动加入白名单；拉黑后设备不能重新注册。</p>
          </div>
          <ElButton :loading="loading" @click="load">刷新</ElButton>
        </div>
      </template>
      <ElTabs v-model="activeTab">
        <ElTabPane :label="`白名单（${data.allowlist.length}）`" name="allowlist">
          <ElTable :data="data.allowlist" v-loading="loading" row-key="serialNumber">
            <ElTableColumn prop="serialNumber" label="设备序列号" min-width="260" />
            <ElTableColumn prop="deviceName" label="设备名称" min-width="150">
              <template #default="{ row }">{{ row.deviceName || '设备数据已清除' }}</template>
            </ElTableColumn>
            <ElTableColumn prop="clientVersion" label="客户端版本" width="130">
              <template #default="{ row }">{{ row.clientVersion || '—' }}</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="110">
              <template #default="{ row }">
                <ElTag :type="row.status === 'active' ? 'success' : 'danger'">
                  {{ row.status === 'active' ? '允许注册' : '已拉黑' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="lastRegisteredAt" label="最近注册" min-width="180" />
            <ElTableColumn label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <ElButton v-if="row.status === 'active'" link type="danger" @click="block(row)"
                  >拉黑</ElButton
                >
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
        <ElTabPane :label="`黑名单（${data.blocklist.length}）`" name="blocklist">
          <ElTable :data="data.blocklist" v-loading="loading" row-key="serialNumber">
            <ElTableColumn prop="serialNumber" label="设备序列号" min-width="260" />
            <ElTableColumn prop="reason" label="拉黑原因" min-width="220" />
            <ElTableColumn prop="blockedByName" label="操作人" width="140" />
            <ElTableColumn prop="blockedAt" label="拉黑时间" min-width="180" />
            <ElTableColumn label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="unblock(row)">解除拉黑</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { apiServerRequest } from '@/api/auth'

  interface Identity {
    serialNumber: string
    credentialVersion: number
    lastRegisteredAt: string
    status: 'active' | 'blocked'
    deviceId: number | null
    deviceName: string
    clientVersion: string
  }
  interface BlockedIdentity {
    serialNumber: string
    reason: string
    blockedByName: string
    blockedAt: string
  }

  const activeTab = ref('allowlist')
  const loading = ref(false)
  const data = reactive<{ allowlist: Identity[]; blocklist: BlockedIdentity[] }>({
    allowlist: [],
    blocklist: []
  })

  async function load() {
    loading.value = true
    try {
      Object.assign(data, (await apiServerRequest.get('/device-identities')).data)
    } catch {
      ElMessage.error('加载设备身份失败')
    } finally {
      loading.value = false
    }
  }
  async function block(row: Identity) {
    try {
      const { value } = await ElMessageBox.prompt(
        '拉黑会清除该设备的数据并阻止它重新注册，请填写原因。',
        '拉黑并删除',
        {
          inputPlaceholder: '请输入拉黑原因',
          inputValidator: (value) => !!value.trim() || '请输入原因'
        }
      )
      await apiServerRequest.post(
        `/device-identities/${encodeURIComponent(row.serialNumber)}/block`,
        {
          reason: value
        }
      )
      ElMessage.success('设备已拉黑并清除运行数据')
      await load()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('拉黑设备失败')
    }
  }
  async function unblock(row: BlockedIdentity) {
    try {
      await ElMessageBox.confirm('解除后客户端可以自动重新注册，是否继续？', '解除拉黑')
      await apiServerRequest.delete(
        `/device-identities/${encodeURIComponent(row.serialNumber)}/block`
      )
      ElMessage.success('已解除拉黑')
      await load()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('解除拉黑失败')
    }
  }
  onMounted(load)
</script>

<style scoped lang="scss">
  .identity-page {
    padding: 16px;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 20px;
  }
  p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
</style>
