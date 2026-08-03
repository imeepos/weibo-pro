/**
 * 代理池测试 - 初始化
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyPool } from '../../core/proxy-pool'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { createPoolTestContext, createRawProxy } from './proxy-pool.test-helpers'
import type {
  ProxyProvider,
  RawProxyData,
  ProxyInfo,
} from '../../types'

describe('ProxyPool', () => {
  describe('initialize', () => {
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

    it('should initialize pool with default count', async () => {
      const rawProxies = [createRawProxy(1), createRawProxy(2)]
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce(rawProxies)

      await pool.initialize()

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(2)
      expect(mockCache.addProxy).toHaveBeenCalledTimes(2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('代理池初始化完成')
      )
    })

    it('should initialize pool with custom count', async () => {
      const rawProxies = Array.from({ length: 5 }, (_, i) => createRawProxy(i))
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce(rawProxies)

      await pool.initialize(5)

      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(5)
      expect(mockCache.addProxy).toHaveBeenCalledTimes(5)
    })

    it('should skip if already initialized', async () => {
      const rawProxies = [createRawProxy(1)]
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce(rawProxies)

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
      vi.mocked(mockProvider.fetchProxies!).mockRejectedValueOnce(error)

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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([rawProxy])

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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([rawProxy])

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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([rawProxy])

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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([rawProxy])

      await pool.initialize(1)

      const addProxyCall = mockCache.addProxy.mock.calls[0]
      const addedProxy = addProxyCall[0] as ProxyInfo

      expect(addedProxy.expiresAt).toBe(new Date(isoString).getTime())
    })
  })
})
