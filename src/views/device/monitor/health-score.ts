export interface HealthDevice {
  realDevice?: boolean
  state: string
  cpu: number | null
  memory: number | null
  disk: number | null
}

/** 依据当前 CPU、内存和磁盘占用评分；离线、未激活或缺项时不生成当前评分。 */
export function getHealth(device: HealthDevice) {
  const metrics = [
    { name: 'CPU', value: device.cpu },
    { name: '内存', value: device.memory },
    { name: '磁盘', value: device.disk }
  ]
  const unavailable = device.state !== 'online' || metrics.some((m) => m.value === null)
  const deductions = metrics.map((m) => ({
    ...m,
    deduction: m.value !== null && m.value >= 90 ? 25 : m.value !== null && m.value >= 80 ? 15 : 0
  }))
  const score = unavailable
    ? null
    : Math.max(0, 100 - deductions.reduce((sum, m) => sum + m.deduction, 0))
  const type: 'info' | 'success' | 'warning' | 'danger' =
    score === null ? 'info' : score >= 90 ? 'success' : score >= 70 ? 'warning' : 'danger'
  const label =
    score === null
      ? device.state === 'offline'
        ? '已离线'
        : '待评估'
      : score >= 90
        ? '健康良好'
        : score >= 70
          ? '需要关注'
          : '存在风险'
  return {
    score,
    type,
    label,
    deductions,
    issues: score === null ? null : deductions.filter((m) => m.deduction > 0).length
  }
}
