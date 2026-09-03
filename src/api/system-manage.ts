import { apiServerRequest } from './auth'
import type { AppRouteRecord } from '@/types/router'

export async function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  const { data } = await apiServerRequest.get<Api.SystemManage.UserList>('/users', { params })
  return data
}

export async function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  const { data } = await apiServerRequest.get<Api.SystemManage.RoleList>('/roles', { params })
  return data
}

/** 当前用户的导航菜单，完全由数据库与角色权限生成。 */
export async function fetchGetMenuList() {
  const { data } = await apiServerRequest.get<AppRouteRecord[]>('/menus/navigation')
  return data
}

export async function fetchGetMenuTree(params: Api.SystemManage.MenuSearchParams = {}) {
  const { data } = await apiServerRequest.get<Api.SystemManage.MenuListItem[]>('/menus/tree', {
    params: { current: 1, size: 100, ...params }
  })
  return data
}

export async function fetchCreateMenu(payload: Api.SystemManage.MenuMutation) {
  const { data } = await apiServerRequest.post<Api.SystemManage.MenuListItem>('/menus', payload)
  return data
}

export async function fetchUpdateMenu(
  menuId: number,
  payload: Partial<Api.SystemManage.MenuMutation>
) {
  const { data } = await apiServerRequest.patch<Api.SystemManage.MenuListItem>(
    `/menus/${menuId}`,
    payload
  )
  return data
}

export async function fetchDeleteMenu(menuId: number) {
  const { data } = await apiServerRequest.delete<{ success: boolean }>(`/menus/${menuId}`)
  return data
}
