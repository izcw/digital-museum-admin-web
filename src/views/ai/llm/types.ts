export type LlmStatus = 'enabled' | 'disabled'

/** OpenAI Compatible 模型配置 */
export interface LlmModel {
  id: number
  name: string
  model: string
  baseUrl: string
  apiKey: string
  organization: string
  project: string
  maxTokens: number
  temperature: number
  topP: number
  timeout: number
  stream: boolean
  isDefault: boolean
  status: LlmStatus
  remark: string
  createdAt: string
  updatedAt: string
}

export type LlmModelMutation = Omit<LlmModel, 'id' | 'createdAt' | 'updatedAt'>

export interface LlmSearchParams {
  keyword?: string
  baseUrl?: string
  status?: LlmStatus
}
