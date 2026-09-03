import axios from 'axios'
import { HttpError } from '@/utils/http/error'
import { ApiStatus } from '@/utils/http/status'
import { ElMessage } from 'element-plus'

type ApiServerLoginResponse = {
  status: 'ok' | 'error'
  type: 'account'
  currentAuthority?: string
}

type ApiServerCurrentUser = {
  data: {
    userid: string
    name: string
    email: string
    access: string
  }
}

export const apiServerRequest = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/',
  withCredentials: true
})

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export async function fetchLogin(params: Api.Auth.LoginParams): Promise<void> {
  const { data } = await apiServerRequest.post<ApiServerLoginResponse>('/login/account', {
    username: params.userName,
    password: params.password,
    type: 'account'
  })

  if (data.status !== 'ok') {
    throw new Error('用户名或密码错误')
  }
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export async function fetchGetUserInfo(): Promise<Api.Auth.UserInfo> {
  try {
    const { data } = await apiServerRequest.get<ApiServerCurrentUser>('/currentUser')
    const user = data.data

    return {
      buttons: [],
      roles: [],
      userId: Number(user.userid),
      userName: user.name,
      email: user.email
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === ApiStatus.unauthorized) {
      ElMessage.error('登录会话已失效，请重新登录')
      throw new HttpError('登录会话已失效，请重新登录', ApiStatus.unauthorized)
    }
    throw error
  }
}
