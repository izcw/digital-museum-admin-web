import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeCollectionOrder } from '../src/views/content/collect/collection-order'

const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id }))
test('reorders visible cards and preserves hidden slots and canonical metadata', () => {
  const result = mergeCollectionOrder(
    items,
    [items[1], items[3]],
    [{ id: 'd', title: 'ignored metadata' }, items[1]]
  )
  assert.deepEqual(
    result.map((item) => item.id),
    ['a', 'd', 'c', 'b']
  )
  assert.equal(result[1], items[3])
  assert.deepEqual(
    items.map((item) => item.id),
    ['a', 'b', 'c', 'd']
  )
})
test('rejects duplicates, missing records and changed filters', () => {
  for (const next of [[items[1], items[1]], [items[1]], [items[1], { id: 'z', title: 'z' }]]) {
    assert.throws(() => mergeCollectionOrder(items, [items[1], items[3]], next))
  }
})
test('unchanged display order does not mutate canonical list', () => {
  assert.deepEqual(mergeCollectionOrder(items, items, [...items]), items)
})
