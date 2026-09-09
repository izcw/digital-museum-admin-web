import assert from 'node:assert/strict'
import test from 'node:test'
import { getHealth } from '../src/views/device/monitor/health-score.ts'

const base = { state: 'online', cpu: 24, memory: 46, disk: 38 }
test('health score applies threshold deductions once per metric', () => {
  assert.equal(getHealth(base).score, 100)
  assert.equal(getHealth({ ...base, cpu: 79 }).score, 100)
  assert.equal(getHealth({ ...base, cpu: 80 }).score, 85)
  assert.equal(getHealth({ ...base, disk: 90 }).score, 75)
  assert.equal(getHealth({ ...base, cpu: 90, memory: 90, disk: 90 }).score, 25)
  assert.equal(getHealth({ ...base, cpu: 90, memory: 90, disk: 90 }).type, 'danger')
})
test('unreported, offline and inactive devices cannot receive a current score', () => {
  for (const patch of [
    { state: 'offline' },
    { state: 'unknown' },
    { cpu: null },
    { realDevice: true }
  ]) {
    assert.equal(getHealth({ ...base, ...patch }).score, null)
    assert.equal(getHealth({ ...base, ...patch }).issues, null)
  }
})
