export interface TelemetryMetric {
  value: number | null
  status: 'ok' | 'error' | 'unsupported'
  sampledAt: string
}
export interface TelemetrySnapshot {
  receivedAt: string
  report: {
    sampledAt: string
    application: { renderer: string; update: string }
    components?: {
      power: string
      network: string
      display: string
      printer3d: string
      rewardDispenser: string
      teachingService: string
      contentService: string
      aiService: string
    }
    info: { systemVersion: string; cpuModel: string; arch: string; ipAddress: string }
    metrics: Record<string, TelemetryMetric>
  }
}
export function metricValue(snapshot: TelemetrySnapshot | undefined, key: string) {
  const metric = snapshot?.report.metrics[key]
  if (!metric || metric.status !== 'ok' || metric.value === null || !Number.isFinite(metric.value))
    return null
  const reportTime = Date.parse(snapshot.report.sampledAt)
  const metricTime = Date.parse(metric.sampledAt)
  if (!Number.isFinite(reportTime) || !Number.isFinite(metricTime)) return null
  if (Math.abs(reportTime - metricTime) > 40000) return null
  return metric.value
}
export function usedPercent(snapshot: TelemetrySnapshot | undefined, prefix: string) {
  const total = metricValue(snapshot, `${prefix}TotalBytes`)
  const free = metricValue(snapshot, `${prefix}AvailableBytes`)
  if (total === null || total <= 0 || free === null || free < 0 || free > total) return null
  return Math.round((1000 * (total - free)) / total) / 10
}

export interface TelemetryMinute {
  minute: string
  heartbeat?: boolean
  heartbeatCount?: number
  metrics: Record<string, { average: number; max: number }>
}

export interface HeartbeatColumn {
  minute: string
  count: number
  visibleCount: number
}

export function heartbeatColumns(
  history: TelemetryMinute[],
  now = Date.now(),
  minutes = 30
): HeartbeatColumn[] {
  return minuteTimeline(history, now, minutes).map((row) => {
    const count = Math.max(0, Math.floor(row.heartbeatCount ?? (row.heartbeat ? 1 : 0)))
    return { minute: row.minute, count, visibleCount: Math.min(5, count) }
  })
}
export function minuteTimeline(
  history: TelemetryMinute[],
  now = Date.now(),
  minutes = 30
): TelemetryMinute[] {
  const lookup = new Map(history.map((row) => [Date.parse(row.minute), row]))
  const end = Math.floor(now / 60000) * 60000
  return Array.from({ length: minutes }, (_, index) => {
    const time = end - (minutes - 1 - index) * 60000
    return (
      lookup.get(time) ?? { minute: new Date(time).toISOString(), heartbeat: false, metrics: {} }
    )
  })
}
