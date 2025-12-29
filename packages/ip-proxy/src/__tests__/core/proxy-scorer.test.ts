/**
 * 代理评分器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyScorer } from '../../core/proxy-scorer'
import { createMockRedis } from '../../__mocks__/redis.mock'
import { createMockLogger } from '../../__mocks__/logger.mock'
import type { ProxyInfo } from '../../types'

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

  describe('getScore', () => {
    it('should return stored score', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      mockRedis.hgetall.mockResolvedValueOnce({
        score: '85',
        totalRequests: '10',
        successRequests: '9',
        avgLatency: '1500',
      })

      const score = await scorer.getScore(proxyUrl)

      expect(score).toBe(85)
    })

    it('should return default score (50) when no data exists', async () => {
      const proxyUrl = 'http://192.168.1.1:8080'

      mockRedis.hgetall.mockResolvedValueOnce({})

      const score = await scorer.getScore(proxyUrl)

      expect(score).toBe(50)
    })

    it('should return default score on Redis error', async () => {
      mockRedis.hgetall.mockRejectedValueOnce(new Error('Redis error'))

      const score = await scorer.getScore('http://192.168.1.1:8080')

      expect(score).toBe(50)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should parse score as integer', async () => {
      mockRedis.hgetall.mockResolvedValueOnce({
        score: '75.8', // Stored as string
      })

      const score = await scorer.getScore('http://192.168.1.1:8080')

      expect(typeof score).toBe('number')
      expect(score).toBe(75)
    })
  })

  describe('getScores', () => {
    it('should return scores for multiple proxies', async () => {
      const urls = [
        'http://192.168.1.1:8080',
        'http://192.168.1.2:8080',
        'http://192.168.1.3:8080',
      ]

      mockRedis.hgetall
        .mockResolvedValueOnce({ score: '80' })
        .mockResolvedValueOnce({ score: '90' })
        .mockResolvedValueOnce({})

      const scores = await scorer.getScores(urls)

      expect(scores.size).toBe(3)
      expect(scores.get(urls[0]!)).toBe(80)
      expect(scores.get(urls[1]!)).toBe(90)
      expect(scores.get(urls[2]!)).toBe(50) // Default
    })

    it('should handle empty array', async () => {
      const scores = await scorer.getScores([])

      expect(scores.size).toBe(0)
    })
  })

  describe('attachScores', () => {
    it('should attach scores to proxies', async () => {
      const proxies: ProxyInfo[] = [
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

      mockRedis.hgetall
        .mockResolvedValueOnce({ score: '85' })
        .mockResolvedValueOnce({ score: '75' })

      const result = await scorer.attachScores(proxies)

      expect(result[0]?.score).toBe(85)
      expect(result[1]?.score).toBe(75)
    })

    it('should use default score for proxies without history', async () => {
      const proxies: ProxyInfo[] = [
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
      ]

      mockRedis.hgetall.mockResolvedValueOnce({})

      const result = await scorer.attachScores(proxies)

      expect(result[0]?.score).toBe(50)
    })

    it('should handle empty proxy list', async () => {
      const result = await scorer.attachScores([])

      expect(result).toEqual([])
    })
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
