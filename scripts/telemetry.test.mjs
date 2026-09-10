import assert from 'node:assert/strict'
import test from 'node:test'
import {
  metricValue,
  usedPercent,
  minuteTimeline,
  heartbeatColumns
} from '../src/views/device/monitor/telemetry-data.ts'
const sampledAt = new Date().toISOString()
const metric = (value) => ({ value, sampledAt, status: 'ok' })
test('真实指标正确换算，零值有效，缺失和过期不冒充正常', () => {
  const snapshot = {
    report: {
      sampledAt,
      metrics: {
        cpuPercent: metric(0),
        memoryTotalBytes: metric(100),
        memoryAvailableBytes: metric(25)
      }
    }
  }
  assert.equal(metricValue(snapshot, 'cpuPercent'), 0)
  assert.equal(usedPercent(snapshot, 'memory'), 75)
  assert.equal(metricValue(snapshot, 'missing'), null)
  snapshot.report.metrics.cpuPercent.sampledAt = new Date(
    Date.parse(sampledAt) - 40001
  ).toISOString()
  assert.equal(metricValue(snapshot, 'cpuPercent'), null)
  snapshot.report.metrics.cpuPercent = { ...metric(0), status: 'error' }
  assert.equal(metricValue(snapshot, 'cpuPercent'), null)
  snapshot.report.metrics.memoryTotalBytes = metric(0)
  assert.equal(usedPercent(snapshot, 'memory'), null)
  snapshot.report.metrics.memoryTotalBytes = metric(100)
  snapshot.report.metrics.memoryAvailableBytes = metric(101)
  assert.equal(usedPercent(snapshot, 'memory'), null)
  snapshot.report.metrics.cpuPercent = { ...metric(10), sampledAt: 'invalid' }
  assert.equal(metricValue(snapshot, 'cpuPercent'), null)
})
test('心跳按分钟生成列并最多显示五格', () => {
  const now = Math.floor(Date.now() / 60000) * 60000
  const columns = heartbeatColumns(
    [{ minute: new Date(now).toISOString(), heartbeat: true, heartbeatCount: 7, metrics: {} }],
    now,
    1
  )
  assert.equal(columns[0].count, 7)
  assert.equal(columns[0].visibleCount, 5)
})
test('趋势固定30分钟并保留离线缺口', () => {
  const now = Math.floor(Date.now() / 60000) * 60000
  const points = minuteTimeline(
    [{ minute: new Date(now).toISOString(), metrics: { cpuPercent: { average: 25, max: 90 } } }],
    now
  )
  assert.equal(points.length, 30)
  assert.deepEqual(points[28].metrics, {})
  assert.equal(points[29].metrics.cpuPercent.max, 90)
})
test('心跳状态生成最近30分钟并明确标记缺口', () => {
  const now = Math.floor(Date.now() / 60000) * 60000
  const points = heartbeatColumns(
    [{ minute: new Date(now).toISOString(), heartbeat: true, metrics: {} }],
    now
  )
  assert.equal(points.length, 30)
  assert.equal(points[28].count, 0)
  assert.equal(points[29].count, 1)
})
