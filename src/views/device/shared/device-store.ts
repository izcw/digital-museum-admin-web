import deviceImage1 from '@imgs/device/device-01.png'
import { apiServerRequest } from '@/api/auth'
import deviceImage2 from '@imgs/device/device-02.png'
import deviceImage3 from '@imgs/device/device-03.png'

export type EnableStatus = 'enabled' | 'disabled'
export type OnlineStatus = 'online' | 'offline' | 'unknown'
export type PowerStatus = 'on' | 'off'
export type ScreenOrientation = 'landscape' | 'portrait'

export interface DeviceModel {
  id: number
  modelCode: string
  modelName: string
  image: string
  manufacturer: string
  operatingSystem: string
  cpu: string
  memory: string
  storage: string
  screenSize?: number
  resolution: string
  orientation: ScreenOrientation
  touchSupported: boolean
  status: EnableStatus
  remark: string
  createdAt: string
  updatedAt: string
}

export interface DeviceTag {
  id: number
  name: string
  code: string
  status: EnableStatus
  remark: string | null
  deviceCount: number
  updatedAt: string
}
export const deviceTags = ref<DeviceTag[]>([])
export async function loadDeviceTags() {
  deviceTags.value = (
    await apiServerRequest.get<DeviceTag[]>('/devices/tags', { timeout: 15000 })
  ).data
}
export interface Device {
  tagIds?: number[]
  tags?: DeviceTag[]
  id: number
  deviceCode: string
  deviceName: string
  serialNumber: string
  modelId: number
  groupId?: number
  schoolId?: number | null
  schoolName?: string
  source?: 'manual' | 'registered'
  location: string
  status: EnableStatus
  onlineStatus: OnlineStatus
  powerStatus: PowerStatus
  lastHeartbeatAt?: string
  lastOnlineAt?: string
  registeredAt?: string
  activatedAt?: string
  ipAddress: string
  macAddress: string
  clientVersion: string
  systemVersion: string
  remark: string
  createdAt: string
  updatedAt: string
}

export type DeviceModelMutation = Omit<DeviceModel, 'id' | 'createdAt' | 'updatedAt'>
export type DeviceMutation = Omit<
  Device,
  | 'id'
  | 'schoolName'
  | 'source'
  | 'tags'
  | 'onlineStatus'
  | 'powerStatus'
  | 'lastHeartbeatAt'
  | 'lastOnlineAt'
  | 'registeredAt'
  | 'activatedAt'
  | 'createdAt'
  | 'updatedAt'
>

const now = () => new Date().toISOString()

export const deviceModels = ref<DeviceModel[]>([
  {
    id: 1,
    modelCode: 'DM-55-A01',
    modelName: '55 英寸卧式触控一体机',
    image: deviceImage1,
    manufacturer: '数字文博科技',
    operatingSystem: 'Windows 11 IoT',
    cpu: 'Intel Core i5-1240P',
    memory: '16 GB',
    storage: '512 GB SSD',
    screenSize: 55,
    resolution: '3840×2160',
    orientation: 'landscape',
    touchSupported: true,
    status: 'enabled',
    remark: '展厅互动查询设备',
    createdAt: '2026-08-16T09:20:00+08:00',
    updatedAt: '2026-09-01T15:10:00+08:00'
  },
  {
    id: 2,
    modelCode: 'DM-43-V02',
    modelName: '43 英寸立式导览一体机',
    image: deviceImage2,
    manufacturer: '数字文博科技',
    operatingSystem: 'Android 13',
    cpu: 'RK3588',
    memory: '8 GB',
    storage: '128 GB',
    screenSize: 43,
    resolution: '2160×3840',
    orientation: 'portrait',
    touchSupported: true,
    status: 'enabled',
    remark: '场馆导览及活动宣传',
    createdAt: '2026-08-18T10:30:00+08:00',
    updatedAt: '2026-09-02T10:05:00+08:00'
  },
  {
    id: 3,
    modelCode: 'DM-32-I01',
    modelName: '32 英寸信息发布屏',
    image: deviceImage3,
    manufacturer: '云屏智能',
    operatingSystem: 'Android 12',
    cpu: 'RK3568',
    memory: '4 GB',
    storage: '64 GB',
    screenSize: 32,
    resolution: '1920×1080',
    orientation: 'landscape',
    touchSupported: false,
    status: 'disabled',
    remark: '旧版型号，停止新增部署',
    createdAt: '2026-07-08T14:00:00+08:00',
    updatedAt: '2026-08-28T17:20:00+08:00'
  }
])

export const devices = ref<Device[]>([])

const nextId = (records: Array<{ id: number }>) =>
  Math.max(0, ...records.filter((item) => item.id < 1_000_000_000).map((item) => item.id)) + 1

export async function loadDevices() {
  devices.value = (await apiServerRequest.get<Device[]>('/devices', { timeout: 15000 })).data
}

export const getModelName = (modelId: number) =>
  deviceModels.value.find((item) => item.id === modelId)?.modelName ?? '未分配型号'

export const getModelImage = (modelId: number) =>
  deviceModels.value.find((item) => item.id === modelId)?.image ?? ''

export const getModelDeviceCount = (modelId: number) =>
  devices.value.filter((item) => item.modelId === modelId).length

export const saveDeviceModel = (payload: DeviceModelMutation, id?: number) => {
  const currentTime = now()
  if (id) {
    const target = deviceModels.value.find((item) => item.id === id)
    if (target) Object.assign(target, payload, { updatedAt: currentTime })
    return
  }
  deviceModels.value.unshift({
    ...payload,
    id: nextId(deviceModels.value),
    createdAt: currentTime,
    updatedAt: currentTime
  })
}

export const removeDeviceModel = (id: number) => {
  deviceModels.value = deviceModels.value.filter((item) => item.id !== id)
}

export const deviceSchools = ref<
  Array<{ id: number; name: string; code: string; status: EnableStatus }>
>([])
export async function loadDeviceSchools() {
  const { data } = await apiServerRequest.get<typeof deviceSchools.value>('/devices/schools', {
    timeout: 15000
  })
  deviceSchools.value = data
}
export async function bindDeviceSchool(id: number, schoolId?: number | null) {
  await apiServerRequest.patch(
    `/devices/${id}/school`,
    { schoolId: schoolId ?? null },
    { timeout: 15000 }
  )
}
export const saveDevice = async (payload: Partial<DeviceMutation>, id?: number) => {
  const data = { ...payload, schoolId: payload.schoolId ?? null }
  if (id) await apiServerRequest.patch(`/devices/${id}`, data, { timeout: 15000 })
  else await apiServerRequest.post('/devices', data, { timeout: 15000 })
}

export const updateDevicePower = (id: number, powerStatus: PowerStatus) => {
  const target = devices.value.find((item) => item.id === id)
  if (!target) return
  target.powerStatus = powerStatus
  target.onlineStatus = powerStatus === 'on' ? 'online' : 'offline'
  target.updatedAt = now()
}

export const removeDevice = async (id: number) => {
  await apiServerRequest.delete(`/devices/${id}`, { timeout: 15000 })
  devices.value = devices.value.filter((item) => item.id !== id)
}
