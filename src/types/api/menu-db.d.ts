declare namespace Api {
  namespace SystemManage {
    interface MenuListItem {
      routeName: string
      component: string
      routeMeta: Record<string, unknown>
      children?: MenuListItem[]
    }

    interface MenuMutation {
      parentId: number | null
      menuName: string
      menuType: MenuListItem['menuType']
      icon: string
      route: string
      routeName: string
      component: string
      routeMeta: Record<string, unknown>
      permissionCode: string
      sort: number
      enabled: boolean
    }
  }
}
