/**
 * 代理池测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyPool } from '../../core/proxy-pool'
import { ProxyCache } from '../../core/proxy-cache'
import { ProxyValidator } from '../../core/proxy-validator'
import { createMockLogger } from '../../__mocks__/logger.mock'
import {
  ProxyPoolExhaustedError,
  ProxyFetchError,
} from '../../errors/proxy-errors'
import type { ProxyProvider, RawProxyData, ProxyInfo } from '../../types'

describe('ProxyPool', () => {
  let pool: ProxyPool
  let mockCache: any
  let mockProvider: ProxyProvider
  let mockValidator: any
  let mockLogger: ReturnType<typeof createMockLogger>

  const createRawProxy = (index: number): RawProxyData => ({
    ip: `192.168.1.${index}`,
    port: 8080,
    protocol: 'http',
    username: 'user',
    password: 'pass',
    expireTime: 60, // 60 seconds
  })

  beforeEach(() => {
    mockCache = {
      addProxy: vi.fn(),
      getLeastUsedProxy: vi.fn(),
      incrementUseCount: vi.fn(),
      decrementUseCount: vi.fn(),
      removeProxy: vi.fn(),
      getAllProxies: vi.fn().mockResolvedValue([]),
    }

    mockProvider = {
      name: 'test-provider',
      fetchProxy: vi.fn(),
      fetchProxies: vi.fn(),
    }

    mockValidator = {
      validateProxy: vi.fn(),
      validateProxies: vi.fn(),
    }

    mockLogger = createMockLogger()

    pool = new ProxyPool(
      mockCache as ProxyCache,
      mockProvider,
      mockValidator as ProxyValidator,
      mockLogger as any
    )

    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize pool with default count', async () => {
      const rawProxies = [createRawProxy(1), createRawProxy(2)]
      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce(rawProxies)

      await pool.initialize()

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(2)
      expect(mockCache.addProxy).toHaveBeenCalledTimes(2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('代理池初始化完成')
      )
    })

    it('should initialize pool with custom count', async () => {
      const rawProxies = Array.from({ length: 5 }, (_, i) => createRawProxy(i))
      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce(rawProxies)

      await pool.initialize(5)

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(5)
      expect(mockCache.addProxy).toHaveBeenCalledTimes(5)
    })

    it('should skip if already initialized', async () => {
      const rawProxies = [createRawProxy(1)]
      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce(rawProxies)

      await pool.initialize()
      await pool.initialize()

      expect(mockProvider.fetchProxies).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('代理池已初始化，跳过')
      )
    })

    it('should use fetchProxy if fetchProxies not available', async () => {
      mockProvider.fetchProxies = undefined
      vi.mocked(mockProvider.fetchProxy).mockResolvedValue(createRawProxy(1))

      await pool.initialize(2)

      expect(mockProvider.fetchProxy).toHaveBeenCalledTimes(2)
      expect(mockCache.addProxy).toHaveBeenCalledTimes(2)
    })

    it('should throw error on provider failure', async () => {
      const error = new Error('Provider failed')
      vi.mocked(mockProvider.fetchProxies).mockRejectedValueOnce(error)

      await expect(pool.initialize()).rejects.toThrow('Provider failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should convert raw proxy data correctly', async () => {
      const rawProxy: RawProxyData = {
        ip: '192.168.1.1',
        port: 8080,
        protocol: 'http',
        username: 'testuser',
        password: 'testpass',
        expireTime: 120, // Relative seconds
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.url).toBe('http://testuser:testpass@192.168.1.1:8080')
      expect(addedProxy.provider).toBe('test-provider')
      expect(addedProxy.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle expireTime as timestamp (milliseconds)', async () => {
      const futureTimestamp = Date.now() + 120000
      const rawProxy: RawProxyData = {
        ip: '192.168.1.1',
        port: 8080,
        protocol: 'http',
        expireTime: futureTimestamp,
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.expiresAt).toBe(futureTimestamp)
    })

    it('should handle expireTime as timestamp (seconds)', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120 // Seconds
      const rawProxy: RawProxyData = {
        ip: '192.168.1.1',
        port: 8080,
        protocol: 'http',
        expireTime: futureTimestamp,
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.expiresAt).toBe(futureTimestamp * 1000)
    })

    it('should handle expireTime as ISO string', async () => {
      const isoString = '2025-12-31T23:59:59.000Z'
      const rawProxy: RawProxyData = {
        ip: '192.168.1.1',
        port: 8080,
        protocol: 'http',
        expireTime: isoString,
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.expiresAt).toBe(new Date(isoString).getTime())
    })
  })

  describe('getProxy', () => {
    it('should auto-initialize if not initialized', async () => {
      const rawProxies = [createRawProxy(1), createRawProxy(2)]
      const mockProxy: ProxyInfo = {
        url: 'http://user:pass@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test-provider',
        createdAt: Date.now(),
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce(rawProxies)
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
      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1)])
      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValueOnce(mockProxy)

      await pool.initialize(1)
      const result = await pool.getProxy()

      expect(result).toEqual(mockProxy)
      expect(mockCache.incrementUseCount).toHaveBeenCalledWith(mockProxy.url)
    })

    it('should throw when pool is exhausted', async () => {
      vi.mocked(mockCache.getLeastUsedProxy).mockResolvedValue(null)
      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([])

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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([createRawProxy(2)])

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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([rawProxy])

      await pool.initialize(0)
      const result = await pool.getProxy()

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(1)
      expect(result).toEqual(newProxy)
    })
  })

  describe('getProxies', () => {
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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
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
      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1), createRawProxy(2)])
      vi.mocked(mockCache.getLeastUsedProxy).mockRejectedValue(new Error('Failed'))

      await pool.initialize(2)
      const results = await pool.getProxies(2)

      expect(results).toEqual([])
    })
  })

  describe('releaseProxy', () => {
    it('should decrement use count', async () => {
      const url = 'http://192.168.1.1:8080'

      await pool.releaseProxy(url)

      expect(mockCache.decrementUseCount).toHaveBeenCalledWith(url)
    })

    it('should throw on cache error', async () => {
      vi.mocked(mockCache.decrementUseCount).mockRejectedValueOnce(
        new Error('Cache error')
      )

      await expect(
        pool.releaseProxy('http://192.168.1.1:8080')
      ).rejects.toThrow('Cache error')
    })
  })

  describe('markProxyFailed', () => {
    it('should remove failed proxy and add new one', async () => {
      const failedUrl = 'http://192.168.1.1:8080'
      const rawProxy = createRawProxy(2)

      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([rawProxy])

      await pool.initialize(1)
      await pool.markProxyFailed(failedUrl)

      expect(mockCache.removeProxy).toHaveBeenCalledWith(failedUrl)
      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(1)
    })

    it('should log warning', async () => {
      const failedUrl = 'http://192.168.1.1:8080'
      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([createRawProxy(1)])

      await pool.initialize(1)
      await pool.markProxyFailed(failedUrl)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('标记代理失效并移除')
      )
    })
  })

  describe('refreshExpiredProxies', () => {
    it('should remove expired proxies and add new ones', async () => {
      const expiredProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() - 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const validProxy: ProxyInfo = {
        url: 'http://192.168.1.2:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(mockCache.getAllProxies).mockResolvedValue([
        expiredProxy,
        validProxy,
      ])
      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([createRawProxy(3)])

      await pool.initialize(2)
      await pool.refreshExpiredProxies()

      expect(mockCache.removeProxy).toHaveBeenCalledWith(expiredProxy.url)
      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(1)
    })

    it('should handle no expired proxies', async () => {
      const validProxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1)])
      vi.mocked(mockCache.getAllProxies).mockResolvedValue([validProxy])

      await pool.initialize(1)
      await pool.refreshExpiredProxies()

      expect(mockCache.removeProxy).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('没有过期代理')
      )
    })
  })

  describe('getPoolStatus', () => {
    it('should return pool size and proxies', async () => {
      const mockProxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
      ]

      vi.mocked(mockProvider.fetchProxies).mockResolvedValueOnce([createRawProxy(1)])
      vi.mocked(mockCache.getAllProxies).mockResolvedValue(mockProxies)

      await pool.initialize(1)
      const status = await pool.getPoolStatus()

      expect(status.size).toBe(1)
      expect(status.proxies).toEqual(mockProxies)
    })
  })

  describe('Edge Cases', () => {
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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([])

      await pool.initialize(3)
      const result = await pool.getProxy()

      expect(result).toEqual(validProxy)
      expect(mockCache.removeProxy).toHaveBeenCalledTimes(2)
    })

    it('should handle provider error during refetch', async () => {
      vi.mocked(mockProvider.fetchProxies)
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

      vi.mocked(mockProvider.fetchProxies).mockResolvedValue([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.url).toBe('http://192.168.1.1:8080')
    })
  })
})
