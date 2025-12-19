import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import type { ProxyInfo } from '../types'
import { CacheKeys, getMetadataKey } from '../constants/cache-keys'

/**
 * 代理缓存层 - 基于Redis Sorted Set实现轮询分配
 */
@Injectable()
export class ProxyCache {
  constructor(
    private readonly redis: RedisClient,
    private readonly logger: Logger
  ) {}

  /**
   * 添加代理到缓存
   * 使用Sorted Set存储使用计数，Hash存储元数据
   */
  async addProxy(proxy: ProxyInfo): Promise<void> {
    try {
      // 1. 添加到Sorted Set（初始计数为0）
      await this.redis.zadd(CacheKeys.USE_COUNTS, 0, proxy.url)

      // 2. 存储元数据到Hash
      const metadataKey = getMetadataKey(proxy.url)
      await this.redis.hmset(metadataKey, {
        url: proxy.url,
        expiresAt: proxy.expiresAt.toString(),
        provider: proxy.provider,
        createdAt: proxy.createdAt.toString(),
      })

      // 3. 设置元数据过期时间（基于代理过期时间）
      const ttlSeconds = Math.max(
        Math.floor((proxy.expiresAt - Date.now()) / 1000),
        1
      )
      await this.redis.expire(metadataKey, ttlSeconds)

      this.logger.debug(
        `[ProxyCache] 添加代理到缓存: ${proxy.url}, TTL: ${ttlSeconds}秒`
      )
    } catch (error) {
      this.logger.error('[ProxyCache] 添加代理失败', error)
      throw error
    }
  }

  /**
   * 获取使用次数最少的代理（轮询分配）
   * 使用ZRANGE获取score最小的成员
   */
  async getLeastUsedProxy(): Promise<ProxyInfo | null> {
    try {
      // 1. 获取使用次数最少的代理URL
      const results = await this.redis.zrange(CacheKeys.USE_COUNTS, 0, 0)

      if (!results || results.length === 0) {
        return null
      }

      const proxyUrl = results[0]!

      // 2. 从Hash获取元数据
      const metadataKey = getMetadataKey(proxyUrl)
      const metadata = await this.redis.hgetall(metadataKey)

      if (!metadata || Object.keys(metadata).length === 0 || !metadata.url) {
        // 元数据已过期或不存在，从Sorted Set移除
        await this.redis.zrem(CacheKeys.USE_COUNTS, proxyUrl)
        this.logger.warn(
          `[ProxyCache] 元数据不存在，已移除: ${proxyUrl}`
        )
        return null
      }

      return {
        url: metadata.url,
        expiresAt: parseInt(metadata.expiresAt!, 10),
        provider: metadata.provider!,
        createdAt: parseInt(metadata.createdAt!, 10),
      }
    } catch (error) {
      this.logger.error('[ProxyCache] 获取最少使用代理失败', error)
      throw error
    }
  }

  /**
   * 增加代理使用计数
   */
  async incrementUseCount(proxyUrl: string): Promise<void> {
    try {
      await this.redis.zincrby(CacheKeys.USE_COUNTS, 1, proxyUrl)
      this.logger.debug(`[ProxyCache] 增加使用计数: ${proxyUrl}`)
    } catch (error) {
      this.logger.error('[ProxyCache] 增加使用计数失败', error)
      throw error
    }
  }

  /**
   * 减少代理使用计数（释放代理）
   */
  async decrementUseCount(proxyUrl: string): Promise<void> {
    try {
      await this.redis.zincrby(CacheKeys.USE_COUNTS, -1, proxyUrl)
      this.logger.debug(`[ProxyCache] 减少使用计数: ${proxyUrl}`)
    } catch (error) {
      this.logger.error('[ProxyCache] 减少使用计数失败', error)
      throw error
    }
  }

  /**
   * 移除代理
   */
  async removeProxy(proxyUrl: string): Promise<void> {
    try {
      // 1. 从Sorted Set移除
      await this.redis.zrem(CacheKeys.USE_COUNTS, proxyUrl)

      // 2. 删除元数据
      const metadataKey = getMetadataKey(proxyUrl)
      await this.redis.del(metadataKey)

      this.logger.info(`[ProxyCache] 移除代理: ${proxyUrl}`)
    } catch (error) {
      this.logger.error('[ProxyCache] 移除代理失败', error)
      throw error
    }
  }

  /**
   * 获取所有代理
   */
  async getAllProxies(): Promise<ProxyInfo[]> {
    try {
      // 1. 获取所有代理URL
      const proxyUrls = await this.redis.zrange(
        CacheKeys.USE_COUNTS,
        0,
        -1
      )

      if (!proxyUrls || proxyUrls.length === 0) {
        return []
      }

      // 2. 批量获取元数据
      const proxies: ProxyInfo[] = []
      for (const url of proxyUrls) {
        const metadataKey = getMetadataKey(url)
        const metadata = await this.redis.hgetall(metadataKey)

        if (metadata && Object.keys(metadata).length > 0 && metadata.url) {
          proxies.push({
            url: metadata.url,
            expiresAt: parseInt(metadata.expiresAt!, 10),
            provider: metadata.provider!,
            createdAt: parseInt(metadata.createdAt!, 10),
          })
        }
      }

      return proxies
    } catch (error) {
      this.logger.error('[ProxyCache] 获取所有代理失败', error)
      throw error
    }
  }

  /**
   * 获取代理池大小
   */
  async getPoolSize(): Promise<number> {
    try {
      return await this.redis.zcard(CacheKeys.USE_COUNTS)
    } catch (error) {
      this.logger.error('[ProxyCache] 获取代理池大小失败', error)
      return 0
    }
  }

  /**
   * 清空代理池
   */
  async clearAll(): Promise<void> {
    try {
      // 1. 获取所有代理URL
      const proxyUrls = await this.redis.zrange(
        CacheKeys.USE_COUNTS,
        0,
        -1
      )

      // 2. 删除所有元数据
      for (const url of proxyUrls) {
        const metadataKey = getMetadataKey(url)
        await this.redis.del(metadataKey)
      }

      // 3. 清空Sorted Set
      await this.redis.del(CacheKeys.USE_COUNTS)

      this.logger.info('[ProxyCache] 清空代理池完成')
    } catch (error) {
      this.logger.error('[ProxyCache] 清空代理池失败', error)
      throw error
    }
  }
}
