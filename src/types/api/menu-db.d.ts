declare namespace Api {
  namespace SystemManage {
    interface MenuListItem {
      children?: MenuListItem[]
    }

    interface MenuMutation {
      parentId: number | null
      menuName: string
      menuType: MenuListItem['menuType']
      icon: string
      route: string
      permissionCode: string
      sort: number
      enabled: boolean
    }
  }
}
