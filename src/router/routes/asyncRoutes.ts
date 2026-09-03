import type { AppRouteRecord } from '@/types/router'

/**
 * 业务菜单已迁移到数据库，由 /menus/navigation 按当前用户权限返回。
 * 此处仅保留空集合以兼容路由处理器的前端模式类型。
 */
export const asyncRoutes: AppRouteRecord[] = []
