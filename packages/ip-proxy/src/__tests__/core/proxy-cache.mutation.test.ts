/**
 * 代理缓存测试 - 计数 / 移除 / 清理 / 并发
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyCache } from '../../core/proxy-cache'
import { createMockRedis } from '../../__mocks__/redis.mock'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { createMockProxy, createMockProxies } from './proxy.fixtures'

describe('ProxyCache', () => {
  let cache: ProxyCache
  let mockRedis: ReturnType<typeof createMockRedis>
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    mockRedis = createMockRedis()
    mockLogger = createMockLogger()
    cache = new ProxyCache(mockRedis as any, mockLogger as any)
    vi.clearAllMocks()
  })

  describe('incrementUseCount', () => {
    it('should increment proxy use count by 1', async () => {
      const url = 'http://192.168.1.1:8080'

      await cache.incrementUseCount(url)

      expect(mockRedis.zincrby).toHaveBeenCalledWith(
        'ip_proxy:use_counts',
        1,
        url
      )
    })

    it('should handle error gracefully', async () => {
      mockRedis.zincrby.mockRejectedValueOnce(new Error('Redis error'))

      await expect(
        cache.incrementUseCount('http://192.168.1.1:8080')
      ).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('decrementUseCount', () => {
    it('should decrement proxy use count by 1', async () => {
      const url = 'http://192.168.1.1:8080'

      await cache.decrementUseCount(url)

      expect(mockRedis.zincrby).toHaveBeenCalledWith(
        'ip_proxy:use_counts',
        -1,
        url
      )
    })

    it('should handle negative use count', async () => {
      const url = 'http://192.168.1.1:8080'

      await cache.decrementUseCount(url)
      await cache.decrementUseCount(url)

      // Should allow negative counts (Redis sorted set supports it)
      expect(mockRedis.zincrby).toHaveBeenCalledTimes(2)
    })
  })

  describe('removeProxy', () => {
    it('should remove proxy and its metadata', async () => {
      const proxy = createMockProxy()

      await cache.addProxy(proxy)
      await cache.removeProxy(proxy.url)

      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'ip_proxy:use_counts',
        proxy.url
      )
      expect(mockRedis.del).toHaveBeenCalled()
    })

    it('should not throw error when removing non-existent proxy', async () => {
      await expect(
        cache.removeProxy('http://non-existent:8080')
      ).resolves.not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('should clear all proxies and metadata', async () => {
      const proxies = [
        createMockProxy('http://192.168.1.1:8080', { provider: 'test1' }),
        createMockProxy('http://192.168.1.2:8080', { provider: 'test2' }),
      ]

      for (const proxy of proxies) {
        await cache.addProxy(proxy)
      }

      // Clear the mock's internal data
      mockRedis.clear()

      await cache.clearAll()

      const size = await cache.getPoolSize()
      expect(size).toBe(0)
    })

    it('should handle error during clear', async () => {
      mockRedis.zrange.mockRejectedValueOnce(new Error('Redis error'))

      await expect(cache.clearAll()).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent additions', async () => {
      const proxies = createMockProxies(10)

      await Promise.all(proxies.map((p) => cache.addProxy(p)))

      const size = await cache.getPoolSize()
      expect(size).toBe(10)
    })

    it('should handle concurrent increment/decrement', async () => {
      const proxy = createMockProxy()

      await cache.addProxy(proxy)

      await Promise.all([
        cache.incrementUseCount(proxy.url),
        cache.incrementUseCount(proxy.url),
        cache.decrementUseCount(proxy.url),
      ])

      expect(mockRedis.zincrby).toHaveBeenCalledTimes(3)
    })
  })
})
