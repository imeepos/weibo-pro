/**
 * 代理缓存测试 - addProxy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyCache } from '../../core/proxy-cache'
import { createMockRedis } from '../../__mocks__/redis.mock'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { createMockProxy, PROXY_URL } from './proxy.fixtures'

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
      const proxy = createMockProxy()

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

      const proxy = createMockProxy(PROXY_URL, { expiresAt, createdAt: now })

      await cache.addProxy(proxy)

      const ttlCall = mockRedis.expire.mock.calls[0]
      expect(ttlCall).toBeDefined()

      const [, ttl] = ttlCall!
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(120)
    })

    it('should handle minimum TTL of 1 second for expired proxy', async () => {
      const now = Date.now()
      const proxy = createMockProxy(PROXY_URL, {
        expiresAt: now - 1000, // Already expired
        createdAt: now,
      })

      await cache.addProxy(proxy)

      const ttlCall = mockRedis.expire.mock.calls[0]
      expect(ttlCall).toBeDefined()
      const [, ttl] = ttlCall!
      expect(ttl).toBe(1) // Minimum TTL
    })

    it('should rethrow error on Redis failure', async () => {
      const proxy = createMockProxy()

      mockRedis.zadd.mockRejectedValueOnce(new Error('Redis error'))

      await expect(cache.addProxy(proxy)).rejects.toThrow('Redis error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
