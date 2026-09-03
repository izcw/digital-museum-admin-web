/**
 * 将接口返回的日期时间统一格式化为本地时间：YYYY-MM-DD HH:mm:ss。
 * 支持 PostgreSQL 的 timestamptz 字符串，例如 2026-09-01 17:35:37.219799+08。
 */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback

  const normalizedValue =
    typeof value === 'string'
      ? value.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T').replace(/([+-]\d{2})$/, '$1:00')
      : value
  const date = value instanceof Date ? value : new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return fallback

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
