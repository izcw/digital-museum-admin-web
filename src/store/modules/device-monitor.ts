import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiServerRequest } from '@/api/auth'
import type { TelemetryMinute, TelemetrySnapshot } from '@/views/device/monitor/telemetry-data'

export type DeviceState = 'online' | 'offline' | 'unknown'
export interface MonitorDevice {
  telemetry?: TelemetrySnapshot
  realDevice?: boolean
  id: number
  name: string
  code: string
  school: string
  state: DeviceState
  tags: string[]
  cpu: number | null
  memory: number | null
  disk: number | null
  heartbeat: string
  ip: string
  version: string
  uptime: string
  location: string
  issue: string
  powerState: string
  offlineReason: string
  collectedAt: string
  freshness: string
}

export const useDeviceMonitorStore = defineStore('deviceMonitorStore', () => {
  const currentDevice = ref<MonitorDevice>()
  const telemetryHistory = ref<TelemetryMinute[]>([])
  const connectionHistory = ref<TelemetryMinute[]>([])
  const historyError = ref('')
  const historyLoading = ref(false)
  let generation = 0
  let loadedSnapshot = ''
  let loadingDeviceId: number | undefined
  let connectionDeviceId: number | undefined

  const hasTelemetry = computed(() => Boolean(currentDevice.value?.telemetry))

  function setCurrentDevice(device?: MonitorDevice) {
    const previousId = currentDevice.value?.id
    currentDevice.value = device
    if (!device || previousId !== device.id) {
      generation++
      telemetryHistory.value = []
      historyError.value = ''
      loadedSnapshot = ''
      connectionHistory.value = []
      connectionDeviceId = undefined
    }
    const snapshot = device?.telemetry?.receivedAt ?? ''
    if (device?.realDevice && snapshot && snapshot !== loadedSnapshot) void refreshHistory()
    if (device?.realDevice && previousId !== device.id) void refreshConnectionHistory()
  }

  async function refreshConnectionHistory() {
    const id = currentDevice.value?.id
    if (!id || connectionDeviceId === id || document.hidden) return
    connectionDeviceId = id
    const current = generation
    try {
      const response = await apiServerRequest.get<TelemetryMinute[]>(
        `/devices/${id}/telemetry/history?minutes=1440`,
        { timeout: 15000 }
      )
      if (current === generation && id === currentDevice.value?.id)
        connectionHistory.value = response.data
    } catch {
      if (current === generation) historyError.value = '连接历史刷新失败，保留现有结果'
    }
  }

  async function refreshHistory() {
    const id = currentDevice.value?.id
    if (!id || loadingDeviceId === id || document.hidden) return
    const current = generation
    loadingDeviceId = id
    historyLoading.value = true
    try {
      const response = await apiServerRequest.get<TelemetryMinute[]>(
        `/devices/${id}/telemetry/history?minutes=30`,
        { timeout: 10000 }
      )
      if (current === generation && id === currentDevice.value?.id) {
        telemetryHistory.value = response.data
        loadedSnapshot = currentDevice.value.telemetry?.receivedAt ?? ''
        historyError.value = ''
      }
    } catch {
      if (current === generation) historyError.value = '历史数据刷新失败，保留上次结果'
    } finally {
      if (loadingDeviceId === id) {
        loadingDeviceId = undefined
        historyLoading.value = false
      }
    }
  }

  function clear() {
    generation++
    currentDevice.value = undefined
    telemetryHistory.value = []
    connectionHistory.value = []
    historyError.value = ''
    loadedSnapshot = ''
    loadingDeviceId = undefined
    connectionDeviceId = undefined
    historyLoading.value = false
  }

  return {
    currentDevice,
    telemetryHistory,
    connectionHistory,
    historyError,
    historyLoading,
    hasTelemetry,
    setCurrentDevice,
    refreshHistory,
    refreshConnectionHistory,
    clear
  }
})
