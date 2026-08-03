/**
 * 代理健康检查器测试 - stop / 生命周期
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

  describe('stop', () => {
    it('should stop health check', () => {
      checker.start()
      checker.stop()

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('健康检查已停止')
      )
    })

    it('should not execute check after stop', async () => {
      checker.start(5000)

      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      checker.stop()

      await vi.advanceTimersByTimeAsync(10000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1) // No new calls
    })

    it('should be safe to call stop when not running', () => {
      checker.stop()

      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should be safe to call stop multiple times', () => {
      checker.start()
      checker.stop()
      checker.stop()
      checker.stop()

      expect(mockLogger.info).toHaveBeenCalledTimes(2) // start + first stop
    })
  })

  describe('Lifecycle Management', () => {
    it('should support restart after stop', async () => {
      checker.start(5000)
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      checker.stop()
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(1)

      checker.start(5000)
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockPool.refreshExpiredProxies).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid start/stop cycles', () => {
      checker.start()
      checker.stop()
      checker.start()
      checker.stop()
      checker.start()

      // 3 start calls + 2 stop calls (stop does nothing when not running)
      expect(mockLogger.info).toHaveBeenCalledTimes(5)
    })
  })
})
