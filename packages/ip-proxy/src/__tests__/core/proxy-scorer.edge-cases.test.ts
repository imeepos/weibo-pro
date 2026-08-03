/**
 * 代理评分器测试 - 评分计算边界情况
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyScorer } from '../../core/proxy-scorer'
import { createMockRedis } from '../../__mocks__/redis.mock'
import { createMockLogger } from '../../__mocks__/logger.mock'

describe('ProxyScorer', () => {
  let scorer: ProxyScorer
  let mockRedis: ReturnType<typeof createMockRedis>
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    mockRedis = createMockRedis()
    mockLogger = createMockLogger()
    scorer = new ProxyScorer(mockRedis as any, mockLogger as any)
    vi.clearAllMocks()
  })

  describe('Score Calculation Edge Cases', () => {
    it('should handle boundary: 0% success rate', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // All failures
      mockRedis.hgetall.mockResolvedValue({
        totalRequests: '5',
        successRequests: '0',
        avgLatency: '1000',
      })

      await scorer.recordResult(proxyUrl, false, 1000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // 0% success contributes 0, latency contributes small amount
      expect(score).toBeLessThan(30)
    })

    it('should handle boundary: 100% success rate', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      mockRedis.hgetall.mockResolvedValue({
        totalRequests: '10',
        successRequests: '10',
        avgLatency: '500',
      })

      await scorer.recordResult(proxyUrl, true, 500)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // 100% success + low latency = high score
      expect(score).toBeGreaterThan(90)
    })

    it('should handle minimum latency contribution', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // Very high latency should give 0 latency score
      await scorer.recordResult(proxyUrl, true, 100000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // Score should be around 70 (only from success rate)
      expect(score).toBeGreaterThanOrEqual(69)
      expect(score).toBeLessThanOrEqual(71)
    })

    it('should handle maximum latency contribution', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // Very low latency should give maximum latency score
      await scorer.recordResult(proxyUrl, true, 10)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // Score should be near 100
      expect(score).toBeGreaterThan(95)
    })
  })
})
