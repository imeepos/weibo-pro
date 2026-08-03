/**
 * 代理评分器测试 - recordResult
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

  describe('recordResult', () => {
    it('should record first successful result', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      await scorer.recordResult(proxyUrl, true, 1000)

      expect(mockRedis.hmset).toHaveBeenCalledWith(
        `ip_proxy:score:${proxyUrl}`,
        expect.objectContaining({
          totalRequests: '1',
          successRequests: '1',
        })
      )

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `ip_proxy:score:${proxyUrl}`,
        7 * 24 * 60 * 60
      )
    })

    it('should record failed result', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      await scorer.recordResult(proxyUrl, false, 5000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>

      expect(data.totalRequests).toBe('1')
      expect(data.successRequests).toBe('0')
    })

    it('should calculate running average latency', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // First request: 1000ms
      await scorer.recordResult(proxyUrl, true, 1000)

      // Second request: 3000ms
      mockRedis.hgetall.mockResolvedValueOnce({
        totalRequests: '1',
        successRequests: '1',
        avgLatency: '1000',
      })
      await scorer.recordResult(proxyUrl, true, 3000)

      const hmsetCall = mockRedis.hmset.mock.calls[1]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>

      // Average should be (1000 + 3000) / 2 = 2000
      expect(parseFloat(data.avgLatency!)).toBe(2000)
    })

    it('should calculate score based on success rate and latency', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // 100% success rate, 1000ms latency
      await scorer.recordResult(proxyUrl, true, 1000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // Success rate contributes 70%, latency contributes 30%
      // successRate = 1.0 → 70 points
      // latencyScore = max(0, 100 - 1000/50) = 80 → 24 points
      // Total = 70 + 24 = 94
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should give lower score for high latency', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // 100% success rate but 5000ms latency
      await scorer.recordResult(proxyUrl, true, 5000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // High latency should reduce score
      expect(score).toBeLessThan(100)
    })

    it('should give lower score for low success rate', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      // First: success
      await scorer.recordResult(proxyUrl, true, 1000)

      // Second: fail
      mockRedis.hgetall.mockResolvedValueOnce({
        totalRequests: '1',
        successRequests: '1',
        avgLatency: '1000',
      })
      await scorer.recordResult(proxyUrl, false, 1000)

      // Third: fail
      mockRedis.hgetall.mockResolvedValueOnce({
        totalRequests: '2',
        successRequests: '1',
        avgLatency: '1000',
      })
      await scorer.recordResult(proxyUrl, false, 1000)

      const hmsetCall = mockRedis.hmset.mock.calls[2]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // 33% success rate should give lower score
      expect(score).toBeLessThan(50)
    })

    it('should update lastUpdate timestamp', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'
      const beforeTime = Date.now()

      await scorer.recordResult(proxyUrl, true, 1000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const lastUpdate = parseInt(data.lastUpdate!, 10)

      expect(lastUpdate).toBeGreaterThanOrEqual(beforeTime)
      expect(lastUpdate).toBeLessThanOrEqual(Date.now())
    })

    it('should handle Redis error gracefully', async () => {
      mockRedis.hgetall.mockRejectedValueOnce(new Error('Redis error'))

      await expect(
        scorer.recordResult('http://192.168.1.1:8080', true, 1000)
      ).resolves.not.toThrow()

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle zero latency', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      await scorer.recordResult(proxyUrl, true, 0)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>

      expect(data.avgLatency).toBe('0')
      expect(parseInt(data.score!, 10)).toBeGreaterThan(0)
    })

    it('should handle very high latency (over 5000ms)', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      await scorer.recordResult(proxyUrl, true, 10000)

      const hmsetCall = mockRedis.hmset.mock.calls[0]
      expect(hmsetCall).toBeDefined()
      const data = hmsetCall![1] as Record<string, string>
      const score = parseInt(data.score!, 10)

      // Latency score should be 0 or near 0 for very high latency
      expect(score).toBeLessThan(80) // Mainly from success rate (70)
    })
  })

  describe('TTL Management', () => {
    it('should set 7-day TTL on score data', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      await scorer.recordResult(proxyUrl, true, 1000)

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `ip_proxy:score:${proxyUrl}`,
        7 * 24 * 60 * 60 // 7 days in seconds
      )
    })
  })
})
