import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import type { ProxyInfo } from '../types'
import { CacheKeys } from '../constants/cache-keys'

/**
 * 代理质量评分器
 *
 * 职责：
 * - 基于延迟和成功率计算代理质量评分
 * - 存储和更新代理评分
 * - 提供基于评分的代理排序
 */
@Injectable()
export class ProxyScorer {
  constructor(
    private readonly redis: RedisClient,
    private readonly logger: Logger
  ) {}

  /**
   * 记录代理使用结果
   */
  async recordResult(
    proxyUrl: string,
    success: boolean,
    latency: number
  ): Promise<void> {
    try {
      const key = `${CacheKeys.SCORE_PREFIX}${proxyUrl}`

      // 获取历史数据
      const data = await this.redis.hgetall(key)
      const totalRequests = parseInt(data.totalRequests || '0', 10)
      const successRequests = parseInt(data.successRequests || '0', 10)
      const avgLatency = parseFloat(data.avgLatency || '0')

      // 更新统计
      const newTotal = totalRequests + 1
      const newSuccess = success ? successRequests + 1 : successRequests
      const newAvgLatency =
        (avgLatency * totalRequests + latency) / newTotal

      // 计算评分（成功率 70% + 延迟 30%）
      const successRate = newSuccess / newTotal
      const latencyScore = Math.max(0, 100 - newAvgLatency / 50) // 5000ms = 0分
      const score = Math.round(successRate * 70 + latencyScore * 0.3)

      // 存储更新后的数据
      await this.redis.hmset(key, {
        totalRequests: newTotal.toString(),
        successRequests: newSuccess.toString(),
        avgLatency: newAvgLatency.toString(),
        score: score.toString(),
        lastUpdate: Date.now().toString(),
      })

      // 设置过期时间（7天）
      await this.redis.expire(key, 7 * 24 * 60 * 60)

      this.logger.debug(
        `[ProxyScorer] 更新代理评分: ${proxyUrl}, 评分: ${score}`
      )
    } catch (error) {
      this.logger.error('[ProxyScorer] 记录代理结果失败', error)
    }
  }

  /**
   * 获取代理评分
   */
  async getScore(proxyUrl: string): Promise<number> {
    try {
      const key = `${CacheKeys.SCORE_PREFIX}${proxyUrl}`
      const data = await this.redis.hgetall(key)

      if (!data || !data.score) {
        return 50 // 默认评分
      }

      return parseInt(data.score, 10)
    } catch (error) {
      this.logger.error('[ProxyScorer] 获取代理评分失败', error)
      return 50
    }
  }

  /**
   * 批量获取代理评分
   */
  async getScores(proxyUrls: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    for (const url of proxyUrls) {
      const score = await this.getScore(url)
      scores.set(url, score)
    }

    return scores
  }

  /**
   * 为代理列表附加评分
   */
  async attachScores(proxies: ProxyInfo[]): Promise<ProxyInfo[]> {
    const urls = proxies.map((p) => p.url)
    const scores = await this.getScores(urls)

    return proxies.map((proxy) => ({
      ...proxy,
      score: scores.get(proxy.url) || 50,
    }))
  }
}
