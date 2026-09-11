import { reactive } from 'vue'
import { apiServerRequest } from '@/api/auth'

export type Status = 'enabled' | 'disabled'
export interface School {
  id: string
  name: string
  code: string
  region: string
  address: string
  status: Status
  remark: string
  adminCount: number
  createTime: string
  updateTime: string
}
export interface SchoolAdmin {
  id: string
  schoolId: string
  schoolName: string
  userName: string
  name: string
  phone: string
  email: string
  status: Status
  remark: string
  createTime: string
  updateTime: string
}
export type SchoolMutation = Omit<School, 'id' | 'adminCount' | 'createTime' | 'updateTime'>
export type AdminMutation = Omit<SchoolAdmin, 'id' | 'schoolName' | 'createTime' | 'updateTime'> & {
  password?: string
}
export interface SearchParams {
  current?: number
  size?: number
  name?: string
  code?: string
  region?: string
  userName?: string
  schoolId?: string
  phone?: string
  status?: Status
}
export const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' }
]
// 下拉框候选项缓存，不作为学校或管理员列表的数据源。
export const schools = reactive<School[]>([])
export async function listSchools(params: SearchParams) {
  return (
    await apiServerRequest.get<Api.Common.PaginatedResponse<School>>('/schools', {
      params,
      timeout: 15000
    })
  ).data
}
export async function getSchool(id: string) {
  return (await apiServerRequest.get<School>(`/schools/${id}`, { timeout: 15000 })).data
}
export async function listAdmins(params: SearchParams) {
  return (
    await apiServerRequest.get<Api.Common.PaginatedResponse<SchoolAdmin>>('/school-admins', {
      params,
      timeout: 15000
    })
  ).data
}
export async function listSchoolAdmins(id: string, current: number, size: number) {
  return (
    await apiServerRequest.get<Api.Common.PaginatedResponse<SchoolAdmin>>(`/schools/${id}/admins`, {
      timeout: 15000,
      params: { current, size }
    })
  ).data
}
export async function saveSchool(payload: Partial<SchoolMutation>, id?: string) {
  return (
    id
      ? await apiServerRequest.patch<School>(`/schools/${id}`, payload, { timeout: 15000 })
      : await apiServerRequest.post<School>('/schools', payload, { timeout: 15000 })
  ).data
}
export async function removeSchool(id: string) {
  return (await apiServerRequest.delete<{ success: true }>(`/schools/${id}`, { timeout: 15000 }))
    .data
}
export async function saveSchoolAdmin(payload: Partial<AdminMutation>, id?: string) {
  return (
    id
      ? await apiServerRequest.patch<SchoolAdmin>(`/school-admins/${id}`, payload, {
          timeout: 15000
        })
      : await apiServerRequest.post<SchoolAdmin>('/school-admins', payload, { timeout: 15000 })
  ).data
}
export async function removeSchoolAdmin(id: string) {
  return (
    await apiServerRequest.delete<{ success: true }>(`/school-admins/${id}`, { timeout: 15000 })
  ).data
}
export async function loadSchoolOptions() {
  const all: School[] = []
  let current = 1
  while (true) {
    const { data } = await apiServerRequest.get<Api.Common.PaginatedResponse<School>>(
      '/school-admins/schools',
      { timeout: 15000, params: { current, size: 100 } }
    )
    all.push(...data.records)
    if (all.length >= data.total || !data.records.length) break
    current++
  }
  schools.splice(0, schools.length, ...all)
}
export function schoolError(error: unknown, fallback = '操作失败，请重试') {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message
  return Array.isArray(message) ? message.join('；') : message || fallback
}
