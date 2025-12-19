import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { Inject, Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import type {
  KuaidailiApiResponse,
  KuaidailiConfig,
  KuaidailiProxyInfo,
  RawProxyData,
} from '../types'
import { BaseProxyProvider } from './base-provider'
import { ProxyFetchError } from '../errors/proxy-errors'

/**
 * 快代理配置注入令牌
 */
export const KUAIDAILI_CONFIG = Symbol('KUAIDAILI_CONFIG')

/**
 * 快代理提供商实现
 */
@Injectable()
export class KuaidailiProvider extends BaseProxyProvider {
  readonly name = 'kuaidaili'

  private readonly axiosInstance: AxiosInstance

  constructor(
    @Inject(KUAIDAILI_CONFIG) private readonly config: KuaidailiConfig,
    @Inject(Logger) private readonly logger: Logger
  ) {
    super()
    this.axiosInstance = axios.create({
      baseURL: 'https://dps.kdlapi.com',
      timeout: 10000,
    })
  }

  async fetchProxy(): Promise<RawProxyData> {
    const proxies = await this.fetchProxies(1)
    return proxies[0]!
  }

  async fetchProxies(count: number): Promise<RawProxyData[]> {
    try {
      this.logger.info(
        `[KuaidailiProvider] 获取 ${count} 个代理IP from 快代理`
      )

      const response = await this.axiosInstance.get<KuaidailiApiResponse>(
        '/api/getdps',
        {
          params: {
            secret_id: this.config.secretId,
            signature: this.generateSignature(),
            num: count,
            pt: 1, // 协议类型：1=HTTP
            format: 'json',
            sep: 1, // 返回格式：分隔符为逗号
            f_et: 1, // 返回过期时间
          },
        }
      )

      if (response.data.code !== 0) {
        throw new ProxyFetchError(
          response.data.msg || '快代理API返回错误',
          this.name,
          { code: response.data.code }
        )
      }

      const proxyList = response.data.data.proxy_list
      if (!proxyList || proxyList.length === 0) {
        throw new ProxyFetchError('快代理返回空列表', this.name)
      }

      return proxyList.map((proxyStr) =>
        this.parseProxyString(proxyStr)
      )
    } catch (error) {
      if (error instanceof ProxyFetchError) {
        throw error
      }

      this.logger.error('[KuaidailiProvider] 获取代理失败', error)
      throw new ProxyFetchError(
        `从快代理获取代理失败: ${(error as Error).message}`,
        this.name,
        { originalError: error }
      )
    }
  }

  /**
   * 解析快代理返回的代理字符串
   * 格式: "ip:port,expire_seconds"
   */
  private parseProxyString(proxyStr: string): RawProxyData {
    const parts = proxyStr.split(',')
    if (parts.length !== 2) {
      throw new Error(`无效的快代理格式: ${proxyStr}`)
    }

    const [ipPort, expireSeconds] = parts
    const [ip, portStr] = ipPort!.split(':')
    const port = parseInt(portStr!, 10)

    if (!ip || isNaN(port)) {
      throw new Error(`无效的IP:PORT格式: ${ipPort}`)
    }

    const proxyInfo: KuaidailiProxyInfo = {
      ip,
      port,
      expireSeconds: parseInt(expireSeconds!, 10),
    }

    return {
      ip: proxyInfo.ip,
      port: proxyInfo.port,
      username: this.config.username,
      password: this.config.password,
      expireTime: proxyInfo.expireSeconds, // 相对时间（秒数）
      protocol: 'http',
    }
  }

  /**
   * 生成快代理签名
   */
  private generateSignature(): string {
    // 快代理的签名是配置中提供的signature字段
    // 注意：快代理的signature是在用户中心预先生成的
    return this.config.secretKey
  }
}
