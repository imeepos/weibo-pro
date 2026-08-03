/**
 * 代理缓存测试 - 查询操作
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

  describe('getLeastUsedProxy', () => {
    it('should return proxy with lowest use count', async () => {
      const proxy = createMockProxy()

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
      const proxy = createMockProxy('http://192.168.1.1:8080', {
        expiresAt: 1704067200000,
        provider: 'kuaidaili',
        createdAt: 1704067000000,
      })

      await cache.addProxy(proxy)

      const result = await cache.getLeastUsedProxy()

      expect(result).toEqual(proxy)
    })
  })

  describe('getAllProxies', () => {
    it('should return all proxies with metadata', async () => {
      const proxies = [
        createMockProxy('http://192.168.1.1:8080', { provider: 'test1' }),
        createMockProxy('http://192.168.1.2:8080', { provider: 'test2' }),
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
      const validProxy = createMockProxy()
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
      const proxies = createMockProxies(2)

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
})
