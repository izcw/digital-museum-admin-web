declare namespace Api {
  namespace SystemManage {
    interface UserMutation {
      userName: string
      userEmail: string
      password?: string
      nickName?: string
      userPhone?: string
      userGender: 'unknown' | 'male' | 'female'
      status: 'enabled' | 'disabled'
      userRoles: string[]
    }
  }
}
