import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import { ProxyPool } from '../core/proxy-pool'
import { parseProxyUrl } from '../utils/proxy-url-parser'

/**
 * Axios代理拦截器
 *
 * 自动为Axios请求注入代理，并处理代理失败
 */
@Injectable()
export class ProxyInterceptor {
  constructor(
    private readonly proxyPool: ProxyPool,
    private readonly logger: Logger
  ) {}

  /**
   * 创建带自动代理注入的Axios实例
   */
  createAxiosInstance(baseConfig?: AxiosRequestConfig): AxiosInstance {
    const instance = axios.create(baseConfig)

    // 请求拦截器：自动注入代理
    instance.interceptors.request.use(
      async (config) => {
        try {
          // 获取可用代理
          const proxy = await this.proxyPool.getProxy()
          const parsed = parseProxyUrl(proxy.url)

          // 注入代理配置
          config.proxy = {
            protocol: parsed.protocol as 'http' | 'https',
            host: parsed.host,
            port: parsed.port,
            auth: parsed.auth
              ? {
                  username: parsed.auth.username,
                  password: parsed.auth.password,
                }
              : undefined,
          }

          // 保存代理URL到元数据，用于响应拦截器
          if (!config.metadata) {
            config.metadata = {}
          }
          config.metadata.proxyUrl = proxy.url

          this.logger.debug(
            `[ProxyInterceptor] 注入代理: ${proxy.url} for ${config.url}`
          )

          return config
        } catch (error) {
          this.logger.error('[ProxyInterceptor] 获取代理失败', error)
          throw error
        }
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器：处理代理失败
    instance.interceptors.response.use(
      (response) => {
        // 请求成功，释放代理
        const proxyUrl = response.config.metadata?.proxyUrl
        if (proxyUrl) {
          this.proxyPool.releaseProxy(proxyUrl).catch((err) => {
            this.logger.error('[ProxyInterceptor] 释放代理失败', err)
          })
        }
        return response
      },
      async (error: AxiosError) => {
        const proxyUrl = error.config?.metadata?.proxyUrl

        // 检查是否为代理相关错误
        if (proxyUrl && this.isProxyError(error)) {
          this.logger.warn(
            `[ProxyInterceptor] 代理失败: ${proxyUrl}, 错误: ${error.message}`
          )

          // 标记代理失效
          await this.proxyPool.markProxyFailed(proxyUrl)
        } else if (proxyUrl) {
          // 非代理错误，仍然释放代理
          await this.proxyPool.releaseProxy(proxyUrl)
        }

        return Promise.reject(error)
      }
    )

    return instance
  }

  /**
   * 判断是否为代理相关错误
   */
  private isProxyError(error: AxiosError): boolean {
    const code = error.code
    const status = error.response?.status

    return (
      // 连接错误
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ENOTFOUND' ||
      code === 'ENETUNREACH' ||
      // 代理认证错误
      status === 407 ||
      // 其他代理相关错误
      error.message.toLowerCase().includes('proxy')
    )
  }
}
