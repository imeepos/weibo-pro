import axios from 'axios'
import type { AxiosProxyConfig } from 'axios'
import { Inject, Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import type { ProxyInfo, ValidationResult, ValidatorConfig } from '../types'
import { ProxyValidationError } from '../errors/proxy-errors'
import { parseProxyUrl } from '../utils/proxy-url-parser'

/**
 * 验证器配置注入令牌
 */
export const PROXY_VALIDATOR_CONFIG = Symbol('PROXY_VALIDATOR_CONFIG')

/**
 * 默认验证器配置
 */
export const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  testUrl: 'https://httpbin.org/ip',
  timeout: 5000,
}

/**
 * 代理验证器 - 批量异步验证代理IP有效性
 */
@Injectable()
export class ProxyValidator {
  private readonly config: ValidatorConfig

  constructor(
    @Inject(PROXY_VALIDATOR_CONFIG, { optional: true })
    config: Partial<ValidatorConfig> | undefined,
    private readonly logger: Logger
  ) {
    this.config = {
      ...DEFAULT_VALIDATOR_CONFIG,
      ...config,
    }
  }

  /**
   * 批量验证代理（并发执行）
   */
  async validateProxies(proxies: ProxyInfo[]): Promise<ValidationResult[]> {
    this.logger.info(
      `[ProxyValidator] 开始批量验证 ${proxies.length} 个代理`
    )

    const startTime = Date.now()
    const results = await Promise.all(
      proxies.map((proxy) => this.validateProxy(proxy))
    )

    const validCount = results.filter((r) => r.valid).length
    const duration = Date.now() - startTime

    this.logger.info(
      `[ProxyValidator] 批量验证完成: ${validCount}/${proxies.length} 有效, 耗时 ${duration}ms`
    )

    return results
  }

  /**
   * 验证单个代理
   */
  async validateProxy(proxy: ProxyInfo): Promise<ValidationResult> {
    const startTime = Date.now()

    try {
      const proxyConfig = this.parseProxyForAxios(proxy.url)

      await axios.get(this.config.testUrl, {
        proxy: proxyConfig,
        timeout: this.config.timeout,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const latency = Date.now() - startTime

      this.logger.debug(
        `[ProxyValidator] 代理验证成功: ${proxy.url}, 延迟 ${latency}ms`
      )

      return {
        proxyUrl: proxy.url,
        valid: true,
        latency,
        error: null,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = (error as Error).message

      this.logger.warn(
        `[ProxyValidator] 代理验证失败: ${proxy.url}, 错误: ${errorMessage}`
      )

      return {
        proxyUrl: proxy.url,
        valid: false,
        latency,
        error: errorMessage,
      }
    }
  }

  /**
   * 解析代理URL为Axios代理配置
   */
  private parseProxyForAxios(proxyUrl: string): AxiosProxyConfig {
    try {
      const parsed = parseProxyUrl(proxyUrl)

      return {
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
    } catch (error) {
      throw new ProxyValidationError(
        `无法解析代理URL: ${proxyUrl}`,
        proxyUrl,
        { originalError: error }
      )
    }
  }
}
