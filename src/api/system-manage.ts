import { apiServerRequest } from './auth'
import type { AppRouteRecord } from '@/types/router'

export async function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  const { data } = await apiServerRequest.get<Api.SystemManage.UserList>('/users', { params })
  return data
}

export async function fetchCreateUser(payload: Api.SystemManage.UserMutation) {
  const { data } = await apiServerRequest.post<Api.SystemManage.UserListItem>('/users', payload)
  return data
}

export async function fetchUpdateUser(
  userId: number,
  payload: Partial<Api.SystemManage.UserMutation>
) {
  const { data } = await apiServerRequest.patch<Api.SystemManage.UserListItem>(
    `/users/${userId}`,
    payload
  )
  return data
}

export async function fetchDeleteUser(userId: number) {
  const { data } = await apiServerRequest.delete<{ success: boolean }>(`/users/${userId}`)
  return data
}

export async function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  const { data } = await apiServerRequest.get<Api.SystemManage.RoleList>('/roles', { params })
  return data
}

export async function fetchCreateRole(payload: Api.SystemManage.RoleMutation) {
  const { data } = await apiServerRequest.post<Api.SystemManage.RoleListItem>('/roles', payload)
  return data
}

export async function fetchUpdateRole(
  roleId: number,
  payload: Partial<Api.SystemManage.RoleMutation>
) {
  const { data } = await apiServerRequest.patch<Api.SystemManage.RoleListItem>(
    `/roles/${roleId}`,
    payload
  )
  return data
}

export async function fetchDeleteRole(roleId: number) {
  const { data } = await apiServerRequest.delete<{ success: boolean }>(`/roles/${roleId}`)
  return data
}

export async function fetchGetRoleMenuIds(roleId: number) {
  const { data } = await apiServerRequest.get<{ menuIds: number[] }>(`/roles/${roleId}/menu-ids`)
  return data
}

export async function fetchUpdateRoleMenus(roleId: number, menuIds: number[]) {
  const { data } = await apiServerRequest.put<{ success: boolean; menuIds: number[] }>(
    `/roles/${roleId}/menus`,
    { menuIds }
  )
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
