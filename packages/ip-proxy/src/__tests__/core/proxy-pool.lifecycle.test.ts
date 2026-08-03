/**
 * 代理池测试 - 代理生命周期管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyPool } from '../../core/proxy-pool'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { createPoolTestContext, createRawProxy } from './proxy-pool.test-helpers'
import type { ProxyProvider, ProxyInfo } from '../../types'

describe('ProxyPool', () => {
  describe('releaseProxy', () => {
    let pool: ProxyPool
    let mockCache: any

    beforeEach(() => {
      const ctx = createPoolTestContext()
      pool = ctx.pool
      mockCache = ctx.mockCache
    })

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

    it('should remove failed proxy and add new one', async () => {
      const failedUrl = 'http://192.168.1.1:8080'
      const rawProxy = createRawProxy(2)

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([rawProxy])

      await pool.initialize(1)
      await pool.markProxyFailed(failedUrl)

      expect(mockCache.removeProxy).toHaveBeenCalledWith(failedUrl)
      expect(mockProvider.fetchProxies).toHaveBeenCalledWith(1)
    })

    it('should log warning', async () => {
      const failedUrl = 'http://192.168.1.1:8080'
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([createRawProxy(1)])

      await pool.initialize(1)
      await pool.markProxyFailed(failedUrl)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('标记代理失效并移除')
      )
    })
  })

  describe('refreshExpiredProxies', () => {
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
      vi.mocked(mockProvider.fetchProxies!).mockResolvedValue([createRawProxy(3)])

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

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1)])
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
    let pool: ProxyPool
    let mockCache: any
    let mockProvider: ProxyProvider

    beforeEach(() => {
      const ctx = createPoolTestContext()
      pool = ctx.pool
      mockCache = ctx.mockCache
      mockProvider = ctx.mockProvider
    })

    it('should return pool size and proxies', async () => {
      const mockProxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
      ]

      vi.mocked(mockProvider.fetchProxies!).mockResolvedValueOnce([createRawProxy(1)])
      vi.mocked(mockCache.getAllProxies).mockResolvedValue(mockProxies)

      await pool.initialize(1)
      const status = await pool.getPoolStatus()

      expect(status.size).toBe(1)
      expect(status.proxies).toEqual(mockProxies)
    })
  })
})
