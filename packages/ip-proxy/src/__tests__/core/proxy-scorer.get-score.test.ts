/**
 * 代理评分器测试 - getScore / getScores / attachScores
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
})
