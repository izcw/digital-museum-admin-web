export type DeviceRealtimeEvent = {
  type:
    | 'telemetry.updated'
    | 'telemetry.stale'
    | 'device.changed'
    | 'realtime.ready'
    | 'realtime.disconnected'
  deviceId: number
  occurredAt: string
}

type Listener = (event: DeviceRealtimeEvent) => void
const listeners = new Set<Listener>()
let socket: WebSocket | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
let retryCount = 0

function websocketUrl() {
  const base = new URL(import.meta.env.VITE_AUTH_API_URL || '/', window.location.origin)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = base.pathname.replace(/\/$/, '') + '/device-events'
  base.search = ''
  base.hash = ''
  return base.toString()
}

function connect() {
  if (
    !listeners.size ||
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  )
    return
  clearTimeout(retryTimer)
  socket = new WebSocket(websocketUrl())
  socket.addEventListener('open', () => {
    retryCount = 0
    const ready: DeviceRealtimeEvent = {
      type: 'realtime.ready',
      deviceId: 0,
      occurredAt: new Date().toISOString()
    }
    for (const listener of listeners) listener(ready)
  })
  socket.addEventListener('message', ({ data }) => {
    try {
      const event = JSON.parse(String(data)) as Partial<DeviceRealtimeEvent>
      if (
        ['telemetry.updated', 'telemetry.stale', 'device.changed'].includes(event.type ?? '') &&
        Number.isSafeInteger(event.deviceId) &&
        typeof event.occurredAt === 'string'
      )
        for (const listener of listeners) listener(event as DeviceRealtimeEvent)
    } catch {
      // 忽略不符合协议的消息，保持现有页面数据。
    }
  })
  socket.addEventListener('close', () => {
    socket = undefined
    if (!listeners.size) return
    const disconnected: DeviceRealtimeEvent = {
      type: 'realtime.disconnected',
      deviceId: 0,
      occurredAt: new Date().toISOString()
    }
    for (const listener of listeners) listener(disconnected)
    retryTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(retryCount++, 5)))
  })
  socket.addEventListener('error', () => socket?.close())
}

export function subscribeDeviceRealtime(listener: Listener) {
  listeners.add(listener)
  connect()
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearTimeout(retryTimer)
      socket?.close()
      socket = undefined
    }
  }
}
