/**
 * 代理池测试 - 获取代理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyPool } from '../../core/proxy-pool'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { createPoolTestContext, createRawProxy } from './proxy-pool.test-helpers'
import {
  ProxyPoolExhaustedError,
  ProxyFetchError,
} from '../../errors/proxy-errors'
import type {
  ProxyProvider,
  RawProxyData,
  ProxyInfo,
} from '../../types'

describe('ProxyPool', () => {
  describe('getProxy', () => {
    let pool: ProxyPool
    let mockCache: any
    let mockProvider: ProxyProvider
    let mockLogger: ReturnType<typeof createMockLogger>

    beforeEach(() => {
      const ctx = createPoolTestContext()
      pool = ctx.pool
      mockCache = ctx.mockCache
      mockProvider = ctx.mockProvider
      mockLogger = ctx.mockLogger
    })

    it('should auto-initialize if not initialized', async () => {
      const rawProxies = [createRawProxy(1), createRawProxy(2)]
      const mockProxy: ProxyInfo = {
        url: 'http://user:pass@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test-provider',
        createdAt: Date.now(),
      }

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce(rawProxies)
      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValueOnce(mockProxy)

      const result = await pool.getProxy()

      expect(mockProvider.fetchProxies).toHaveBeenCalled()
      expect(result).toEqual(mockProxy)
    })

    it('should return least used proxy', async () => {
      const mockProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      // Mock provider for initialization
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1)])
      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValueOnce(mockProxy)

      await pool.initialize(1)
      const result = await pool.getProxy()

      expect(result).toEqual(mockProxy)
      expect(mockCache.incrementUseCount).toHaveBeenCalledWith(mockProxy.url)
    })

    it('should throw when pool is exhausted', async () => {
      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValue(null)
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([])

      await pool.initialize(0)

      await expect(pool.getProxy()).rejects.toThrow(ProxyPoolExhaustedError)
    })

    it('should refresh when proxy is expired', async () => {
      const expiredProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() - 60000, // Expired
        provider: 'test',
        createdAt: Date.now(),
      }

      const freshProxy: ProxyInfo = {
        url: 'http://192.168.1.2:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(mockCache.getLeastUsedProxy)
        .mockResolvedValueOnce(expiredProxy)
        .mockResolvedValueOnce(freshProxy)

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([createRawProxy(2)])

      await pool.initialize(1)
      const result = await pool.getProxy()

      expect(mockCache.removeProxy).toHaveBeenCalledWith(expiredProxy.url)
      expect(result).toEqual(freshProxy)
    })

    it('should refetch proxy when pool is empty', async () => {
      const rawProxy = createRawProxy(1)
      const newProxy: ProxyInfo = {
        url: 'http://user:pass@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test-provider',
        createdAt: Date.now(),
      }

      vi.mocked(mockCache.getLeastUsedProxy)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newProxy)

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([rawProxy])

      await pool.initialize(0)
      const result = await pool.getProxy()

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(1)
      expect(result).toEqual(newProxy)
    })
  })

  describe('getProxies', () => {
    let pool: ProxyPool
    let mockCache: any
    let mockProvider: ProxyProvider
    let mockLogger: ReturnType<typeof createMockLogger>

    beforeEach(() => {
      const ctx = createPoolTestContext()
      pool = ctx.pool
      mockCache = ctx.mockCache
      mockProvider = ctx.mockProvider
      mockLogger = ctx.mockLogger
    })

    it('should return multiple proxies', async () => {
      const mockProxies: ProxyInfo[] = [
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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
      vi.mocked(mockCache.getLeastUsedProxy)
        .mockResolvedValueOnce(mockProxies[0]!)
        .mockResolvedValueOnce(mockProxies[1]!)

      await pool.initialize(2)
      const results = await pool.getProxies(2)

      expect(results).toEqual(mockProxies)
    })

    it('should continue on individual failures', async () => {
      const mockProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
      vi.mocked(mockCache.getLeastUsedProxy)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockProxy)

      await pool.initialize(2)
      const results = await pool.getProxies(2)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(mockProxy)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should return empty array if all fail', async () => {
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
      vi.mocked(mockCache.getLeastUsedProxy).mockRejectedValue(new Error('Failed'))

      await pool.initialize(2)
      const results = await pool.getProxies(2)

      expect(results).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    let pool: ProxyPool
    let mockCache: any
    let mockProvider: ProxyProvider

    beforeEach(() => {
      const ctx = createPoolTestContext()
      pool = ctx.pool
      mockCache = ctx.mockCache
      mockProvider = ctx.mockProvider
    })

    it('should handle recursive getProxy calls for expired proxies', async () => {
      const expiredProxy1: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() - 1000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const expiredProxy2: ProxyInfo = {
        url: 'http://192.168.1.2:8080',
        expiresAt: Date.now() - 1000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const validProxy: ProxyInfo = {
        url: 'http://192.168.1.3:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(mockCache.getLeastUsedProxy)
        .mockResolvedValueOnce(expiredProxy1)
        .mockResolvedValueOnce(expiredProxy2)
        .mockResolvedValueOnce(validProxy)

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([])

      await pool.initialize(3)
      const result = await pool.getProxy()

      expect(result).toEqual(validProxy)
      expect(mockCache.removeProxy).toHaveBeenCalledTimes(2)
    })

    it('should handle provider error during refetch', async () => {
      vi.mocked(mockProvider.fetchProxies!)
        .mockResolvedValueOnce([]) // First call for initialization
        .mockRejectedValueOnce(new Error('Provider error')) // Second call during refetch

      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValue(null)

      await pool.initialize(0)

      await expect(pool.getProxy()).rejects.toThrow(ProxyFetchError)
    })

    it('should handle proxy without username/password', async () => {
      const rawProxy: RawProxyData = {
        ip: '192.168.1.1',
        port: 8080,
        protocol: 'http',
        expireTime: 60,
      }

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.url).toBe('http://192.168.1.1:8080')
    })
  })
})
