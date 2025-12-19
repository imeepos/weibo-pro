/**
 * 原始代理数据接口（从提供商获取）
 */
export interface RawProxyData {
  /** IP地址 */
  ip: string

  /** 端口 */
  port: number

  /** 认证用户名（可选） */
  username?: string

  /** 认证密码（可选） */
  password?: string

  /** 过期时间（ISO 8601 格式或时间戳） */
  expireTime: string | number

  /** 协议类型 */
  protocol: 'http' | 'https' | 'socks5'
}

/**
 * 代理提供商接口
 */
export interface ProxyProvider {
  /** 提供商名称 */
  readonly name: string

  /** 获取单个代理 */
  fetchProxy(): Promise<RawProxyData>

  /** 批量获取代理（可选实现） */
  fetchProxies?(count: number): Promise<RawProxyData[]>
}

/**
 * 快代理配置
 */
export interface KuaidailiConfig {
  /** 快代理 secret_id */
  secretId: string

  /** 快代理 secret_key（用于签名） */
  secretKey: string

  /** 快代理认证用户名 */
  username: string

  /** 快代理认证密码 */
  password: string
}

/**
 * 快代理API响应数据
 */
export interface KuaidailiApiResponse {
  code: number
  msg?: string
  data: {
    proxy_list: string[] // 格式: "ip:port,expire_seconds"
  }
}

/**
 * 快代理代理信息
 */
export interface KuaidailiProxyInfo {
  ip: string
  port: number
  expireSeconds: number // 相对过期时间（秒数）
}
