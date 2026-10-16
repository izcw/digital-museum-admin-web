/** 仅重排当前可见项，保留筛选隐藏藏品的位置，不让查看排序覆盖服务端顺序。 */
export function mergeCollectionOrder<T extends { id: string }>(
  all: T[],
  visible: T[],
  next: T[]
): T[] {
  const visibleIds = new Set(visible.map((item) => item.id))
  const nextIds = new Set(next.map((item) => item.id))
  const allIds = new Set(all.map((item) => item.id))
  if (
    next.length !== visible.length ||
    nextIds.size !== next.length ||
    [...nextIds].some((id) => !visibleIds.has(id) || !allIds.has(id))
  ) {
    throw new Error('藏品排序清单已变化')
  }
  const byId = new Map(all.map((item) => [item.id, item]))
  let cursor = 0
  return all.map((item) => (visibleIds.has(item.id) ? (byId.get(next[cursor++].id) ?? item) : item))
}
