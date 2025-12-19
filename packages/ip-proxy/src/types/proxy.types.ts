/**
 * 代理信息接口
 */
export interface ProxyInfo {
  /** 代理URL，格式：http://user:pass@ip:port 或 http://ip:port */
  url: string

  /** 过期时间戳（毫秒） */
  expiresAt: number

  /** 提供商名称 */
  provider: string

  /** 创建时间戳（毫秒） */
  createdAt: number
}

/**
 * 代理配置选项
 */
export interface ProxyOptions {
  /** 是否启用代理验证，默认 false */
  enableValidation?: boolean

  /** 代理池最小数量，默认 2 */
  minPoolSize?: number

  /** 代理池最大数量，默认 10 */
  maxPoolSize?: number

  /** 过期缓冲时间（毫秒），默认 30000（30秒） */
  expirationBuffer?: number
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 代理URL */
  proxyUrl: string

  /** 是否有效 */
  valid: boolean

  /** 延迟（毫秒） */
  latency: number

  /** 错误信息 */
  error: string | null
}

/**
 * 验证器配置
 */
export interface ValidatorConfig {
  /** 验证代理的测试URL */
  testUrl: string

  /** 验证超时时间（毫秒） */
  timeout: number
}

/**
 * 代理管理器接口
 */
export interface ProxyManager {
  /** 获取可用代理 */
  getProxy(): Promise<ProxyInfo>

  /** 批量获取代理 */
  getProxies(count: number): Promise<ProxyInfo[]>

  /** 释放代理（减少使用计数） */
  releaseProxy(url: string): Promise<void>

  /** 刷新过期代理 */
  refreshExpired(): Promise<void>

  /** 创建带代理的Axios实例 */
  createAxios(config?: any): any

  /** 启动带代理的Playwright浏览器 */
  launchBrowser(
    type: 'chromium' | 'firefox' | 'webkit',
    options?: any
  ): Promise<any>
}

/**
 * 解析后的代理配置
 */
export interface ParsedProxyConfig {
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  auth?: {
    username: string
    password: string
  }
}
