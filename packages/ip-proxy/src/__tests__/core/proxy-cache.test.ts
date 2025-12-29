/**
 * 代理缓存测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyCache } from '../../core/proxy-cache'
import { createMockRedis } from '../../__mocks__/redis.mock'
import { createMockLogger } from '../../__mocks__/logger.mock'
import type { ProxyInfo } from '../../types'

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

  describe('addProxy', () => {
    it('should add proxy to cache with metadata', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      await cache.addProxy(proxy)

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'ip_proxy:use_counts',
        0,
        proxy.url
      )
      expect(mockRedis.hmset).toHaveBeenCalled()
      expect(mockRedis.expire).toHaveBeenCalled()
    })

    it('should set TTL based on proxy expiration', async () => {
      const now = Date.now()
      const expiresAt = now + 120000 // 120 seconds

      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt,
        provider: 'test',
        createdAt: now,
      }

      await cache.addProxy(proxy)

      const ttlCall = mockRedis.expire.mock.calls[0]
      expect(ttlCall).toBeDefined()

      const [, ttl] = ttlCall
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(120)
    })

    it('should handle minimum TTL of 1 second for expired proxy', async () => {
      const now = Date.now()
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: now - 1000, // Already expired
        provider: 'test',
        createdAt: now,
      }

      await cache.addProxy(proxy)

      const ttlCall = mockRedis.expire.mock.calls[0]
      const [, ttl] = ttlCall
      expect(ttl).toBe(1) // Minimum TTL
    })

    it('should rethrow error on Redis failure', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      mockRedis.zadd.mockRejectedValueOnce(new Error('Redis error'))

      await expect(cache.addProxy(proxy)).rejects.toThrow('Redis error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getLeastUsedProxy', () => {
    it('should return proxy with lowest use count', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      await cache.addProxy(proxy)

      const result = await cache.getLeastUsedProxy()

      expect(result).toEqual(proxy)
      expect(mockRedis.zrange).toHaveBeenCalledWith('ip_proxy:use_counts', 0, 0)
    })

    it('should return null when cache is empty', async () => {
      const result = await cache.getLeastUsedProxy()

      expect(result).toBeNull()
    })

    it('should return null and remove when metadata is missing', async () => {
      // Add proxy URL to sorted set but not metadata
      await mockRedis.zadd('ip_proxy:use_counts', 0, 'http://192.168.1.1:8080')

      const result = await cache.getLeastUsedProxy()

      expect(result).toBeNull()
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'ip_proxy:use_counts',
        'http://192.168.1.1:8080'
      )
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should return null when metadata is empty object', async () => {
      await mockRedis.zadd('ip_proxy:use_counts', 0, 'http://192.168.1.1:8080')
      mockRedis.hgetall.mockResolvedValueOnce({})

      const result = await cache.getLeastUsedProxy()

      expect(result).toBeNull()
    })

    it('should parse metadata correctly', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: 1704067200000,
        provider: 'kuaidaili',
        createdAt: 1704067000000,
      }

      await cache.addProxy(proxy)

      const result = await cache.getLeastUsedProxy()

      expect(result).toEqual(proxy)
    })
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
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

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

  describe('getAllProxies', () => {
    it('should return all proxies with metadata', async () => {
      const proxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test1',
          createdAt: Date.now(),
        },
        {
          url: 'http://192.168.1.2:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test2',
          createdAt: Date.now(),
        },
      ]

      for (const proxy of proxies) {
        await cache.addProxy(proxy)
      }

      const result = await cache.getAllProxies()

      expect(result).toHaveLength(2)
      expect(result).toEqual(expect.arrayContaining(proxies))
    })

    it('should return empty array when cache is empty', async () => {
      const result = await cache.getAllProxies()

      expect(result).toEqual([])
    })

    it('should skip proxies with missing metadata', async () => {
      // Add one valid proxy
      const validProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }
      await cache.addProxy(validProxy)

      // Add an invalid entry (only URL, no metadata)
      await mockRedis.zadd('ip_proxy:use_counts', 0, 'http://invalid:8080')

      const result = await cache.getAllProxies()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(validProxy)
    })
  })

  describe('getPoolSize', () => {
    it('should return correct pool size', async () => {
      const proxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
        {
          url: 'http://192.168.1.2:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
      ]

      for (const proxy of proxies) {
        await cache.addProxy(proxy)
      }

      const size = await cache.getPoolSize()

      expect(size).toBe(2)
    })

    it('should return 0 for empty pool', async () => {
      const size = await cache.getPoolSize()

      expect(size).toBe(0)
    })

    it('should return 0 on Redis error', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('Redis error'))

      const size = await cache.getPoolSize()

      expect(size).toBe(0)
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('should clear all proxies and metadata', async () => {
      const proxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test1',
          createdAt: Date.now(),
        },
        {
          url: 'http://192.168.1.2:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test2',
          createdAt: Date.now(),
        },
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
      const proxies: ProxyInfo[] = Array.from({ length: 10 }, (_, i) => ({
        url: `http://192.168.1.${i}:8080`,
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }))

      await Promise.all(proxies.map((p) => cache.addProxy(p)))

      const size = await cache.getPoolSize()
      expect(size).toBe(10)
    })

    it('should handle concurrent increment/decrement', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

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
