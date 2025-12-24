/**
 * Better Auth 客户端集成
 *
 * 提供认证功能和 token 管理
 */
import { createAuthClient } from 'better-auth/client'

export interface AuthClientOptions {
  /** Better Auth 服务器 URL */
  baseURL?: string
  /** 自定义 token 存储 */
  tokenStorage?: {
    getToken: () => Promise<string | null> | string | null
    setToken: (token: string) => Promise<void> | void
    removeToken: () => Promise<void> | void
  }
}

/**
 * 创建带认证功能的客户端配置
 */
export function createAuthenticatedClientConfig(options: AuthClientOptions = {}) {
  const { baseURL, tokenStorage } = options

  // 创建 Better Auth 客户端
  const authClient = createAuthClient({
    baseURL: baseURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  })

  /**
   * 获取当前的认证 token
   */
  const getAuthToken = async (): Promise<string | null> => {
    if (tokenStorage?.getToken) {
      return await tokenStorage.getToken()
    }

    // 默认从 cookie 或 localStorage 获取 token
    // Better Auth 默认使用 cookie 存储 session
    // 这里可以根据需要自定义获取逻辑
    return null
  }

  /**
   * 创建带认证的 fetch 配置
   */
  const createAuthenticatedFetchConfig = async () => {
    const token = await getAuthToken()

    return {
      baseURL,
      onRequest: async (context: any) => {
        // 在每个请求中自动附带认证信息
        if (token) {
          context.options.headers = {
            ...context.options.headers,
            Authorization: `Bearer ${token}`,
          }
        }
        return context
      },
      onError: async (context: any) => {
        // 处理认证错误（401）
        if (context.response?.status === 401) {
          // 可以在这里触发登录流程或刷新 token
          console.warn('Authentication failed, please login again')
        }
        return context
      },
    }
  }

  return {
    authClient,
    getAuthToken,
    createAuthenticatedFetchConfig,
  }
}

/**
 * 导出 Better Auth 客户端创建函数
 * 用于登录、注册等认证操作
 */
export { createAuthClient }
