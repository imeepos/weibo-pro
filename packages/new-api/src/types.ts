export interface NewApiConfig {
  baseURL: string
  timeout?: number
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
  verification_code?: string
  aff_code?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    id: number
    username: string
    display_name: string
    role: number
    status: number
    group: string
    require_2fa?: boolean
  }
}

export interface TokenResponse {
  success: boolean
  message: string
  data?: string
}

export interface RedemptionRequest {
  name: string
  count: number
  quota: number
  expired_time: number
}

export interface RedemptionResponse {
  success: boolean
  message: string
  data?: string[]
}
