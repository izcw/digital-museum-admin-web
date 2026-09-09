import { apiServerRequest } from '@/api/auth'

export type VersionStatus =
  | 'draft'
  | 'scheduled'
  | 'releasing'
  | 'paused'
  | 'published'
  | 'partial_failed'
  | 'archived'

export type ReleaseTaskStatus =
  | 'scheduled'
  | 'releasing'
  | 'paused'
  | 'completed'
  | 'partial_failed'
  | 'cancelled'

export type DeviceUpdateStatus = 'pending' | 'downloading' | 'installed' | 'failed'

export interface DeviceUpdateResult {
  id: number
  deviceId: number
  status: DeviceUpdateStatus
  errorMessage?: string
  updatedAt: string
}

export interface ReleaseTask {
  id: number
  versionId: number
  status: ReleaseTaskStatus
  targetGroupIds: number[]
  targetGroups: string[]
  rolloutPercentage: number
  mandatory: boolean
  scheduledAt?: string
  createdBy: string
  createdAt: string
  installedCount: number
  failedCount: number
  deviceResults: DeviceUpdateResult[]
}

export interface VersionRecord {
  id: number
  version: string
  fileName: string
  fileSize: number
  mimeType: string
  checksum: string
  releaseNotes: string
  status: VersionStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  downloadUrl: string
  latestTask?: ReleaseTask
  releaseTasks?: ReleaseTask[]
}

export interface VersionDraft {
  version: string
  releaseNotes: string
  file: File
}

export interface CreateReleaseTaskInput {
  allSchools: boolean
  schoolIds: number[]
  rolloutPercentage: number
  mandatory: boolean
  scheduledAt?: string
}

type VersionListResponse = {
  records: VersionRecord[]
  current: number
  size: number
  total: number
}

export const versionRecords = ref<VersionRecord[]>([])
export const releaseTasks = ref<ReleaseTask[]>([])

function synchronizeVersion(record: VersionRecord) {
  const index = versionRecords.value.findIndex((item) => item.id === record.id)
  if (index >= 0) versionRecords.value[index] = record
  else versionRecords.value.unshift(record)

  const tasks = record.releaseTasks ?? (record.latestTask ? [record.latestTask] : [])
  if (record.releaseTasks) {
    releaseTasks.value = [
      ...releaseTasks.value.filter((task) => task.versionId !== record.id),
      ...record.releaseTasks
    ]
  } else if (record.latestTask) {
    releaseTasks.value = [
      ...releaseTasks.value.filter((task) => task.id !== record.latestTask!.id),
      ...tasks
    ]
  }
  return record
}

export async function loadVersions() {
  const records: VersionRecord[] = []
  let current = 1
  let total = 0
  do {
    const { data } = await apiServerRequest.get<VersionListResponse>('/ota/versions', {
      params: { current, size: 100 }
    })
    records.push(...data.records)
    total = data.total
    if (!data.records.length) break
    current += 1
  } while (records.length < total)
  versionRecords.value = records
  const versionIds = new Set(records.map((record) => record.id))
  const latestIds = new Set(
    records.flatMap((record) => (record.latestTask ? [record.latestTask.id] : []))
  )
  releaseTasks.value = [
    ...releaseTasks.value.filter(
      (task) => versionIds.has(task.versionId) && !latestIds.has(task.id)
    ),
    ...records.flatMap((record) => (record.latestTask ? [record.latestTask] : []))
  ]
  return { records, total }
}

export async function loadVersionDetail(versionId: number) {
  const { data } = await apiServerRequest.get<VersionRecord>(`/ota/versions/${versionId}`)
  return synchronizeVersion(data)
}

// 使用登录 Cookie 直接流式下载，不在浏览器内存中缓存整个安装包，也不暴露 OTA 令牌。
export const getVersionDownloadUrl = (versionId: number) =>
  apiServerRequest.getUri({ url: `/ota/versions/${versionId}/download` })

export const getVersionTasks = (versionId: number) =>
  releaseTasks.value
    .filter((task) => task.versionId === versionId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)

export const getLatestTask = (versionId: number) => getVersionTasks(versionId)[0]

export async function addVersionDraft(draft: VersionDraft) {
  const formData = new FormData()
  formData.append('version', draft.version)
  formData.append('releaseNotes', draft.releaseNotes)
  formData.append('file', draft.file)
  const { data } = await apiServerRequest.post<VersionRecord>('/ota/versions', formData)
  return synchronizeVersion(data)
}

export async function deleteVersionDraft(versionId: number) {
  await apiServerRequest.delete(`/ota/versions/${versionId}`)
  versionRecords.value = versionRecords.value.filter((item) => item.id !== versionId)
  releaseTasks.value = releaseTasks.value.filter((task) => task.versionId !== versionId)
}

export async function createReleaseTask(versionId: number, input: CreateReleaseTaskInput) {
  const { data } = await apiServerRequest.post<VersionRecord>(
    `/ota/versions/${versionId}/release-tasks`,
    input
  )
  return synchronizeVersion(data)
}

async function patchVersion(versionId: number, action: string) {
  const { data } = await apiServerRequest.patch<VersionRecord>(
    `/ota/versions/${versionId}/${action}`
  )
  return synchronizeVersion(data)
}

export const pauseReleaseTask = (versionId: number) =>
  patchVersion(versionId, 'release-tasks/current/pause')

export const resumeReleaseTask = (versionId: number) =>
  patchVersion(versionId, 'release-tasks/current/resume')

export const cancelReleaseTask = (versionId: number) =>
  patchVersion(versionId, 'release-tasks/current/cancel')

export const retryDeviceUpdate = (versionId: number, deviceId: number) =>
  patchVersion(versionId, `devices/${deviceId}/retry`)

export const archiveVersion = (versionId: number) => patchVersion(versionId, 'archive')
