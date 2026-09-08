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

export interface DeviceGroup {
  id: number
  groupCode: string
  groupName: string
  parentId?: number
  level: number
  path: string
  location: string
  sort: number
  status: EnableStatus
  remark: string
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: number
  deviceCode: string
  deviceName: string
  serialNumber: string
  modelId: number
  groupId?: number
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
export type DeviceGroupMutation = Omit<
  DeviceGroup,
  'id' | 'level' | 'path' | 'createdAt' | 'updatedAt'
>
export type DeviceMutation = Omit<
  Device,
  | 'id'
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

export const deviceGroups = ref<DeviceGroup[]>([
  {
    id: 1,
    groupCode: 'MUSEUM-HALL',
    groupName: '中央展馆',
    level: 1,
    path: '/1',
    location: '中央展馆',
    sort: 1,
    status: 'enabled',
    remark: '展馆设备总分组',
    createdAt: '2026-08-10T09:00:00+08:00',
    updatedAt: '2026-08-10T09:00:00+08:00'
  },
  {
    id: 2,
    groupCode: 'HALL-A',
    groupName: '一层序厅',
    parentId: 1,
    level: 2,
    path: '/1/2',
    location: '中央展馆一层',
    sort: 1,
    status: 'enabled',
    remark: '',
    createdAt: '2026-08-10T09:10:00+08:00',
    updatedAt: '2026-08-19T11:20:00+08:00'
  },
  {
    id: 3,
    groupCode: 'HALL-B',
    groupName: '二层常设展厅',
    parentId: 1,
    level: 2,
    path: '/1/3',
    location: '中央展馆二层',
    sort: 2,
    status: 'enabled',
    remark: '',
    createdAt: '2026-08-10T09:15:00+08:00',
    updatedAt: '2026-08-19T11:25:00+08:00'
  },
  {
    id: 4,
    groupCode: 'WAREHOUSE',
    groupName: '库房备用设备',
    level: 1,
    path: '/4',
    location: '设备库房',
    sort: 2,
    status: 'disabled',
    remark: '待检修及备用设备',
    createdAt: '2026-08-12T13:00:00+08:00',
    updatedAt: '2026-09-01T08:30:00+08:00'
  }
])

export const devices = ref<Device[]>([
  {
    id: 1,
    deviceCode: 'DEV-HALL-A-001',
    deviceName: '序厅互动查询屏 01',
    serialNumber: 'SN55A012026001',
    modelId: 1,
    groupId: 2,
    location: '一层序厅东侧',
    status: 'enabled',
    onlineStatus: 'online',
    powerStatus: 'on',
    lastHeartbeatAt: '2026-09-04T14:20:31+08:00',
    lastOnlineAt: '2026-09-04T14:20:31+08:00',
    registeredAt: '2026-08-20T09:00:00+08:00',
    activatedAt: '2026-08-20T09:12:00+08:00',
    ipAddress: '192.168.10.31',
    macAddress: 'A4:C3:F0:12:10:31',
    clientVersion: '2.4.1',
    systemVersion: 'Windows 11 IoT 23H2',
    remark: '',
    createdAt: '2026-08-20T08:50:00+08:00',
    updatedAt: '2026-09-04T14:20:31+08:00'
  },
  {
    id: 2,
    deviceCode: 'DEV-HALL-A-002',
    deviceName: '序厅数字导览屏 01',
    serialNumber: 'SN43V022026006',
    modelId: 2,
    groupId: 2,
    location: '一层序厅入口',
    status: 'enabled',
    onlineStatus: 'online',
    powerStatus: 'on',
    lastHeartbeatAt: '2026-09-04T14:20:18+08:00',
    lastOnlineAt: '2026-09-04T14:20:18+08:00',
    registeredAt: '2026-08-22T10:30:00+08:00',
    activatedAt: '2026-08-22T10:42:00+08:00',
    ipAddress: '192.168.10.32',
    macAddress: 'A4:C3:F0:12:10:32',
    clientVersion: '2.4.1',
    systemVersion: 'Android 13',
    remark: '',
    createdAt: '2026-08-22T10:20:00+08:00',
    updatedAt: '2026-09-04T14:20:18+08:00'
  },
  {
    id: 3,
    deviceCode: 'DEV-HALL-B-001',
    deviceName: '常设展厅互动屏 01',
    serialNumber: 'SN55A012026009',
    modelId: 1,
    groupId: 3,
    location: '二层展厅 2-1 区',
    status: 'enabled',
    onlineStatus: 'offline',
    powerStatus: 'off',
    lastHeartbeatAt: '2026-09-04T08:36:10+08:00',
    lastOnlineAt: '2026-09-04T08:36:10+08:00',
    registeredAt: '2026-08-25T14:00:00+08:00',
    activatedAt: '2026-08-25T14:10:00+08:00',
    ipAddress: '192.168.20.21',
    macAddress: 'A4:C3:F0:12:20:21',
    clientVersion: '2.4.0',
    systemVersion: 'Windows 11 IoT 23H2',
    remark: '等待现场检查网络',
    createdAt: '2026-08-25T13:50:00+08:00',
    updatedAt: '2026-09-04T08:36:10+08:00'
  },
  {
    id: 4,
    deviceCode: 'DEV-HALL-B-002',
    deviceName: '常设展厅数字导览屏 02',
    serialNumber: 'SN43V022026011',
    modelId: 2,
    groupId: 3,
    location: '二层展厅 2-3 区',
    status: 'enabled',
    onlineStatus: 'unknown',
    powerStatus: 'off',
    ipAddress: '',
    macAddress: 'A4:C3:F0:12:20:22',
    clientVersion: '',
    systemVersion: 'Android 13',
    remark: '已录入，尚未激活',
    createdAt: '2026-09-03T16:30:00+08:00',
    updatedAt: '2026-09-03T16:30:00+08:00'
  },
  {
    id: 5,
    deviceCode: 'DEV-SPARE-001',
    deviceName: '备用信息发布屏 01',
    serialNumber: 'SN32I012025018',
    modelId: 3,
    groupId: 4,
    location: '设备库房 A 架',
    status: 'disabled',
    onlineStatus: 'offline',
    powerStatus: 'off',
    lastHeartbeatAt: '2026-08-28T16:10:00+08:00',
    lastOnlineAt: '2026-08-28T16:10:00+08:00',
    registeredAt: '2026-07-10T09:00:00+08:00',
    activatedAt: '2026-07-10T09:08:00+08:00',
    ipAddress: '',
    macAddress: 'A4:C3:F0:12:30:01',
    clientVersion: '1.9.8',
    systemVersion: 'Android 12',
    remark: '已停用',
    createdAt: '2026-07-10T08:40:00+08:00',
    updatedAt: '2026-08-28T16:10:00+08:00'
  }
])

const nextId = (records: Array<{ id: number }>) =>
  Math.max(0, ...records.filter((item) => item.id < 1_000_000_000).map((item) => item.id)) + 1

const registeredGroupId = 2_147_483_647
export async function loadRegisteredDevices() {
  const { data } = await apiServerRequest.get<
    Array<{
      id: number
      serialNumber: string
      clientVersion: string
      createdAt: string
      updatedAt: string
    }>
  >('/ota/devices')
  if (!deviceGroups.value.some((group) => group.id === registeredGroupId)) {
    deviceGroups.value.push({
      id: registeredGroupId,
      groupCode: 'OTA-REGISTERED',
      groupName: '自动注册终端',
      level: 1,
      path: `/${registeredGroupId}`,
      location: '',
      sort: 999,
      status: 'enabled',
      remark: '客户端自动登记的真实电脑',
      createdAt: now(),
      updatedAt: now()
    })
  }
  devices.value = [
    ...devices.value.filter((device) => device.id < 1_000_000_000),
    ...data.map((device) => ({
      id: device.id,
      deviceCode: device.serialNumber,
      deviceName: `终端 ${device.serialNumber.slice(-8)}`,
      serialNumber: device.serialNumber,
      modelId: 0,
      groupId: registeredGroupId,
      location: '',
      status: 'enabled' as const,
      onlineStatus: 'unknown' as const,
      powerStatus: 'off' as const,
      registeredAt: device.createdAt,
      ipAddress: '',
      macAddress: '',
      clientVersion: device.clientVersion,
      systemVersion: 'Windows',
      remark: '自动注册',
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    }))
  ]
}

export const getModelName = (modelId: number) =>
  deviceModels.value.find((item) => item.id === modelId)?.modelName ?? '未分配型号'

export const getModelImage = (modelId: number) =>
  deviceModels.value.find((item) => item.id === modelId)?.image ?? ''

export const getGroupName = (groupId?: number) =>
  groupId
    ? (deviceGroups.value.find((item) => item.id === groupId)?.groupName ?? '未知分组')
    : '未分组'

export const getModelDeviceCount = (modelId: number) =>
  devices.value.filter((item) => item.modelId === modelId).length

export const getGroupDeviceCount = (groupId: number) =>
  devices.value.filter((item) => item.groupId === groupId).length

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

export const saveDeviceGroup = (payload: DeviceGroupMutation, id?: number) => {
  const currentTime = now()
  const parent = payload.parentId
    ? deviceGroups.value.find((item) => item.id === payload.parentId)
    : undefined
  const level = parent ? parent.level + 1 : 1
  if (id) {
    const target = deviceGroups.value.find((item) => item.id === id)
    if (target) {
      Object.assign(target, payload, {
        level,
        path: parent ? `${parent.path}/${id}` : `/${id}`,
        updatedAt: currentTime
      })
    }
    return
  }
  const newId = nextId(deviceGroups.value)
  deviceGroups.value.push({
    ...payload,
    id: newId,
    level,
    path: parent ? `${parent.path}/${newId}` : `/${newId}`,
    createdAt: currentTime,
    updatedAt: currentTime
  })
}

export const removeDeviceGroup = (id: number) => {
  deviceGroups.value = deviceGroups.value.filter((item) => item.id !== id)
}

export const saveDevice = (payload: DeviceMutation, id?: number) => {
  const currentTime = now()
  if (id) {
    const target = devices.value.find((item) => item.id === id)
    if (target) Object.assign(target, payload, { updatedAt: currentTime })
    return
  }
  devices.value.unshift({
    ...payload,
    id: nextId(devices.value),
    onlineStatus: 'unknown',
    powerStatus: 'off',
    createdAt: currentTime,
    updatedAt: currentTime
  })
}

export const updateDevicePower = (id: number, powerStatus: PowerStatus) => {
  const target = devices.value.find((item) => item.id === id)
  if (!target) return
  target.powerStatus = powerStatus
  target.onlineStatus = powerStatus === 'on' ? 'online' : 'offline'
  target.updatedAt = now()
}

export const removeDevice = (id: number) => {
  devices.value = devices.value.filter((item) => item.id !== id)
}
