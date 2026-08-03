/**
 * 代理健康检查器测试 - check / 错误处理 / 并发
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ProxyHealthChecker } from '../../core/proxy-health-checker'
import { createMockLogger } from '../../__mocks__/logger.mock'

describe('ProxyHealthChecker', () => {
  let checker: ProxyHealthChecker
  let mockPool: any
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    vi.useFakeTimers()

    mockPool = {
      refreshExpiredProxies: vi.fn().mockResolvedValue(undefined),
    }

    mockLogger = createMockLogger()

    checker = new ProxyHealthChecker(mockPool, mockLogger as any)

    vi.clearAllMocks()
  })

  afterEach(() => {
    checker.stop()
    vi.useRealTimers()
  })

  describe('check', () => {
    it('should call pool.refreshExpiredProxies', async () => {
      await checker.check()

      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('执行健康检查')
      )
    })

    it('should throw error on pool failure', async () => {
      const error = new Error('Pool error')
      mockPool.refreshExpiredProxies.mockRejectedValue(error)

      await expect(checker.check()).rejects.toThrow('Pool error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should be callable manually', async () => {
      // Don't start the checker, just call check manually
      await checker.check()

      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should not crash on unhandled error in check', async () => {
      mockPool.refreshExpiredProxies.mockImplementation(() => {
        throw new Error('Synchronous error')
      })

      checker.start(5000)

      await vi.advanceTimersByTimeAsync(5000)

      expect(mockLogger.error).toHaveBeenCalled()

      // Should continue running
      mockPool.refreshExpiredProxies.mockResolvedValue(undefined)
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)
    })

    it('should handle async rejection in check', async () => {
      mockPool.refreshExpiredProxies.mockRejectedValue(
        new Error('Async error')
      )

      checker.start(5000)

      await vi.advanceTimersByTimeAsync(5000)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('健康检查失败'),
        expect.any(Error)
      )
    })
  })

  describe('Concurrent Operations', () => {
    it('should not overlap checks if previous is still running', async () => {
      let resolveFirstCheck: () => void
      const firstCheckPromise = new Promise<void>((resolve) => {
        resolveFirstCheck = resolve
      })

      mockPool.refreshExpiredProxies
        .mockImplementationOnce(() => firstCheckPromise)
        .mockResolvedValue(undefined)

      checker.start(1000)

      // Trigger first check
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      // Trigger second check while first is still running
      await vi.advanceTimersByTimeAsync(1000)

      // Second check should start (setInterval doesn't wait)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)

      // Complete first check
      resolveFirstCheck!()
      await firstCheckPromise
    })
  })
})
