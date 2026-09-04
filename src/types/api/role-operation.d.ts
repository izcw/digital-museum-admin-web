declare namespace Api {
  namespace SystemManage {
    interface RoleMutation {
      roleName: string
      roleCode: string
      description?: string
      enabled: boolean
    }
  }
}
