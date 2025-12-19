import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import type { ProxyInfo, ProxyProvider, RawProxyData } from '../types'
import { ProxyCache } from './proxy-cache'
import { ProxyValidator } from './proxy-validator'
import {
  ProxyPoolExhaustedError,
  ProxyFetchError,
} from '../errors/proxy-errors'
import { getAbsoluteExpireTime, getUnixTimestamp, isExpired } from '../utils/time'

/**
 * 核心代理池管理器
 *
 * 职责：
 * - 管理代理IP的获取、分配、过期检测
 * - 自动刷新过期代理
 * - 轮询分配策略（基于使用次数）
 */
@Injectable()
export class ProxyPool {
  private isInitialized = false

  constructor(
    private readonly cache: ProxyCache,
    private readonly provider: ProxyProvider,
    private readonly validator: ProxyValidator,
    private readonly logger: Logger
  ) {}

  /**
   * 初始化代理池
   */
  async initialize(initialCount: number = 2): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('[ProxyPool] 代理池已初始化，跳过')
      return
    }

    this.logger.info(`[ProxyPool] 初始化代理池，目标数量: ${initialCount}`)

    try {
      // 1. 获取代理
      const rawProxies = this.provider.fetchProxies
        ? await this.provider.fetchProxies(initialCount)
        : await Promise.all(
            Array.from({ length: initialCount }, () =>
              this.provider.fetchProxy()
            )
          )

      // 2. 转换为ProxyInfo
      const proxies = rawProxies.map((raw) => this.convertToProxyInfo(raw))

      // 3. 批量验证（可选）
      // 这里暂时跳过验证，直接添加到缓存
      // const validationResults = await this.validator.validateProxies(proxies)

      // 4. 添加到缓存
      for (const proxy of proxies) {
        await this.cache.addProxy(proxy)
      }

      this.isInitialized = true
      this.logger.info(
        `[ProxyPool] 代理池初始化完成，已添加 ${proxies.length} 个代理`
      )
    } catch (error) {
      this.logger.error('[ProxyPool] 代理池初始化失败', error)
      throw error
    }
  }

  /**
   * 获取可用代理（自动检测过期并刷新）
   */
  async getProxy(): Promise<ProxyInfo> {
    // 确保初始化
    if (!this.isInitialized) {
      await this.initialize()
    }

    // 1. 从缓存获取最少使用的代理
    let proxy = await this.cache.getLeastUsedProxy()

    // 2. 检查代理池是否为空
    if (!proxy) {
      this.logger.warn('[ProxyPool] 代理池为空，尝试重新获取')
      await this.fetchAndAddProxies(1)
      proxy = await this.cache.getLeastUsedProxy()

      if (!proxy) {
        throw new ProxyPoolExhaustedError()
      }
    }

    // 3. 检查代理是否过期
    if (isExpired(proxy.expiresAt)) {
      this.logger.info(`[ProxyPool] 代理已过期: ${proxy.url}，移除并获取新代理`)
      await this.cache.removeProxy(proxy.url)

      // 递归获取新代理
      return this.getProxy()
    }

    // 4. 增加使用计数
    await this.cache.incrementUseCount(proxy.url)

    this.logger.debug(`[ProxyPool] 分配代理: ${proxy.url}`)
    return proxy
  }

  /**
   * 批量获取代理
   */
  async getProxies(count: number): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = []

    for (let i = 0; i < count; i++) {
      try {
        const proxy = await this.getProxy()
        proxies.push(proxy)
      } catch (error) {
        this.logger.error(`[ProxyPool] 获取第${i + 1}个代理失败`, error)
        // 如果获取失败，尝试继续获取剩余代理
      }
    }

    return proxies
  }

  /**
   * 释放代理（减少使用计数）
   */
  async releaseProxy(proxyUrl: string): Promise<void> {
    try {
      await this.cache.decrementUseCount(proxyUrl)
      this.logger.debug(`[ProxyPool] 释放代理: ${proxyUrl}`)
    } catch (error) {
      this.logger.error('[ProxyPool] 释放代理失败', error)
      throw error
    }
  }

  /**
   * 标记代理失效（从池中移除）
   */
  async markProxyFailed(proxyUrl: string): Promise<void> {
    try {
      await this.cache.removeProxy(proxyUrl)
      this.logger.warn(`[ProxyPool] 标记代理失效并移除: ${proxyUrl}`)

      // 自动补充一个新代理
      await this.fetchAndAddProxies(1)
    } catch (error) {
      this.logger.error('[ProxyPool] 标记代理失败失败', error)
      throw error
    }
  }

  /**
   * 刷新过期代理
   */
  async refreshExpiredProxies(): Promise<void> {
    try {
      this.logger.info('[ProxyPool] 开始刷新过期代理')

      const allProxies = await this.cache.getAllProxies()
      const expiredProxies = allProxies.filter((p) => isExpired(p.expiresAt))

      if (expiredProxies.length === 0) {
        this.logger.info('[ProxyPool] 没有过期代理')
        return
      }

      // 移除过期代理
      for (const proxy of expiredProxies) {
        await this.cache.removeProxy(proxy.url)
      }

      this.logger.info(
        `[ProxyPool] 已移除 ${expiredProxies.length} 个过期代理`
      )

      // 补充新代理
      await this.fetchAndAddProxies(expiredProxies.length)
    } catch (error) {
      this.logger.error('[ProxyPool] 刷新过期代理失败', error)
      throw error
    }
  }

  /**
   * 获取代理池状态
   */
  async getPoolStatus(): Promise<{
    size: number
    proxies: ProxyInfo[]
  }> {
    const proxies = await this.cache.getAllProxies()
    return {
      size: proxies.length,
      proxies,
    }
  }

  /**
   * 从提供商获取并添加代理
   */
  private async fetchAndAddProxies(count: number): Promise<void> {
    try {
      this.logger.info(`[ProxyPool] 从提供商获取 ${count} 个新代理`)

      const rawProxies = this.provider.fetchProxies
        ? await this.provider.fetchProxies(count)
        : await Promise.all(
            Array.from({ length: count }, () => this.provider.fetchProxy())
          )
      const proxies = rawProxies.map((raw) => this.convertToProxyInfo(raw))

      for (const proxy of proxies) {
        await this.cache.addProxy(proxy)
      }

      this.logger.info(`[ProxyPool] 成功添加 ${proxies.length} 个新代理`)
    } catch (error) {
      this.logger.error('[ProxyPool] 获取并添加代理失败', error)
      throw new ProxyFetchError(
        `从提供商获取代理失败: ${(error as Error).message}`,
        this.provider.name,
        { originalError: error }
      )
    }
  }

  /**
   * 将原始代理数据转换为ProxyInfo
   */
  private convertToProxyInfo(raw: RawProxyData): ProxyInfo {
    // 构建代理URL
    const auth =
      raw.username && raw.password ? `${raw.username}:${raw.password}@` : ''
    const url = `${raw.protocol}://${auth}${raw.ip}:${raw.port}`

    // 处理过期时间
    let expiresAt: number
    if (typeof raw.expireTime === 'number') {
      // 如果是秒数（相对时间），转换为绝对时间戳
      if (raw.expireTime < 10000) {
        expiresAt = getAbsoluteExpireTime(raw.expireTime)
      } else {
        // 如果是时间戳（毫秒或秒）
        expiresAt = raw.expireTime < 10000000000 ? raw.expireTime * 1000 : raw.expireTime
      }
    } else {
      // ISO 8601 字符串
      expiresAt = new Date(raw.expireTime).getTime()
    }

    return {
      url,
      expiresAt,
      provider: this.provider.name,
      createdAt: getUnixTimestamp(),
    }
  }
}
