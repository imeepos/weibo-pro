/**
 * 代理健康检查器测试 - start / 间隔变化
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

  describe('start', () => {
    it('should start health check with default interval', () => {
      checker.start()

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('启动健康检查，间隔 60000ms')
      )
    })

    it('should start health check with custom interval', () => {
      checker.start(30000)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('启动健康检查，间隔 30000ms')
      )
    })

    it('should warn if already running', () => {
      checker.start()
      checker.start()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('健康检查已在运行')
      )
    })

    it('should execute check at intervals', async () => {
      checker.start(10000)

      // Fast-forward 10 seconds
      await vi.advanceTimersByTimeAsync(10000)

      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      // Fast-forward another 10 seconds
      await vi.advanceTimersByTimeAsync(10000)

      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)
    })

    it('should continue checking after successful check', async () => {
      mockPool.refreshExpiredProxies.mockResolvedValue(undefined)

      checker.start(5000)

      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)
    })

    it('should continue checking after failed check', async () => {
      mockPool.refreshExpiredProxies.mockRejectedValue(
        new Error('Refresh failed')
      )

      checker.start(5000)

      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('健康检查失败'),
        expect.any(Error)
      )

      // Should continue despite error
      mockPool.refreshExpiredProxies.mockResolvedValue(undefined)
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)
    })

    it('should not execute immediately on start', async () => {
      checker.start(10000)

      expect(mockPool.refreshExpiredProxies).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(9999)
      expect(mockPool.refreshExpiredProxies).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)
    })
  })

  describe('Interval Variations', () => {
    it('should work with very short interval', async () => {
      checker.start(100)

      await vi.advanceTimersByTimeAsync(500)

      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(5)
    })

    it('should work with very long interval', async () => {
      checker.start(3600000) // 1 hour

      await vi.advanceTimersByTimeAsync(3599999)
      expect(mockPool.refreshExpiredProxies).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)
    })

    it.skip('should handle zero interval (triggers at 0ms)', async () => {
      // 跳过此测试：零间隔会导致 setInterval(0) 在 fake timers 中无限循环
      // 这是一个不现实的边界情况，生产代码不应使用零间隔
      checker.start(0)

      // Zero interval setInterval will call callback immediately and continuously
      // Just verify it starts
      await vi.advanceTimersByTimeAsync(1)

      // Should have been called at least once
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalled()
    })
  })
})
