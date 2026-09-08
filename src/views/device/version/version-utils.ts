/** 比较合法 SemVer，忽略构建元数据，正式版高于同号预发布版。 */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const [core, ...prerelease] = value.split('+')[0].split('-')
    return {
      core: core.split('.').map(Number),
      pre: prerelease.join('-').split('.').filter(Boolean)
    }
  }
  const left = parse(a)
  const right = parse(b)
  for (let index = 0; index < 3; index += 1) {
    const difference = left.core[index] - right.core[index]
    if (difference) return difference
  }
  if (!left.pre.length || !right.pre.length)
    return Number(!left.pre.length) - Number(!right.pre.length)
  for (let index = 0; index < Math.max(left.pre.length, right.pre.length); index += 1) {
    const l = left.pre[index]
    const r = right.pre[index]
    if (l === undefined) return -1
    if (r === undefined) return 1
    if (l === r) continue
    const ln = /^\d+$/.test(l)
    const rn = /^\d+$/.test(r)
    if (ln && rn) return BigInt(l) < BigInt(r) ? -1 : 1
    if (ln !== rn) return ln ? -1 : 1
    return l < r ? -1 : 1
  }
  return 0
}
