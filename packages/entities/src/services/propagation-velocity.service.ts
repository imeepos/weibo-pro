import { Injectable, Inject } from '@sker/core'
import { DataSource } from 'typeorm'
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity'
import { logger } from '@sker/core'

/**
 * 传播速度指数接口
 */
export interface PropagationVelocity {
  viralCoefficient: number      // 病毒系数 = 平均每个帖子带来的转发数
  hourlyGrowthRates: number[]    // 每小时增长率数组
  peakVelocity: number          // 峰值速度 = 最大小时增长率
  accelerationPhase: 'accelerating' | 'decelerating' | 'stable'  // 加速阶段
}

/**
 * 病毒系数结果
 */
export interface ViralCoefficientResult {
  viralCoefficient: number
}

/**
 * 小时增长率结果
 */
export interface HourlyGrowthRateResult {
  hourlyGrowthRates: (number | undefined)[]
  peakVelocity: number
}

/**
 * 传播速度计算服务
 *
 * TDD Phase 2: GREEN - 实现最小化代码让测试通过
 */
@Injectable()
export class PropagationVelocityService {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  /**
   * 计算病毒系数
   * 公式：总转发数 / 总帖子数
   */
  async calculateViralCoefficient(
    statistics: Array<{
      post_count: number
      repost_count: number
      year: number
      month: number
      day: number
      hour: number
    }>
  ): Promise<ViralCoefficientResult> {
    const totalPosts = statistics.reduce((sum, s) => sum + s.post_count, 0)
    const totalReposts = statistics.reduce((sum, s) => sum + s.repost_count, 0)

    // 避免除以零
    const viralCoefficient = totalPosts > 0 ? totalReposts / totalPosts : 0

    return { viralCoefficient }
  }

  /**
   * 计算小时增长率
   * 公式：(当前小时帖子数 - 上一小时帖子数) / 上一小时帖子数 * 100
   */
  async calculateHourlyGrowthRates(
    statistics: Array<{
      post_count: number
      year: number
      month: number
      day: number
      hour: number
    }>
  ): Promise<HourlyGrowthRateResult> {
    const hourlyGrowthRates: (number | undefined)[] = []

    for (let i = 0; i < statistics.length; i++) {
      if (i === 0) {
        // 第一小时没有上一小时数据，无法计算增长率
        hourlyGrowthRates.push(undefined)
        continue
      }

      const currentPosts = statistics[i]!.post_count
      const previousPosts = statistics[i - 1]!.post_count

      // 处理边界情况：上一小时帖子数为 0
      if (previousPosts === 0) {
        // 从 0 增长到任何数字都视为 100% 增长
        hourlyGrowthRates.push(currentPosts > 0 ? 100 : 0)
        continue
      }

      const growthRate = ((currentPosts - previousPosts) / previousPosts) * 100
      hourlyGrowthRates.push(growthRate)
    }

    // 计算峰值速度（排除 undefined）
    const validRates = hourlyGrowthRates.filter((rate): rate is number => rate !== undefined)
    const peakVelocity = validRates.length > 0 ? Math.max(...validRates) : 0

    return { hourlyGrowthRates, peakVelocity }
  }

  /**
   * 判断加速阶段
   * - accelerating: 增长率连续上升
   * - decelerating: 增长率连续下降
   * - stable: 增长率波动较小或数据不足
   */
  determineAccelerationPhase(
    hourlyGrowthRates: (number | undefined)[]
  ): 'accelerating' | 'decelerating' | 'stable' {
    // 过滤有效的增长率数据
    const validRates = hourlyGrowthRates.filter((rate): rate is number => rate !== undefined)

    // 数据不足（少于3个有效数据点）
    if (validRates.length < 3) {
      return 'stable'
    }

    // 计算趋势
    let increasingCount = 0
    let decreasingCount = 0

    for (let i = 1; i < validRates.length; i++) {
      const diff = validRates[i]! - validRates[i - 1]!
      if (diff > 1) {
        // 增长率上升（阈值1%避免噪声）
        increasingCount++
      } else if (diff < -1) {
        // 增长率下降
        decreasingCount++
      }
    }

    // 判断趋势
    if (increasingCount >= decreasingCount * 2 && increasingCount >= 2) {
      return 'accelerating'
    } else if (decreasingCount >= increasingCount * 2 && decreasingCount >= 2) {
      return 'decelerating'
    } else {
      return 'stable'
    }
  }

  /**
   * 计算完整的传播速度指数
   */
  async calculatePropagationVelocity(
    eventId: string,
    statistics: Array<{
      post_count: number
      repost_count: number
      year: number
      month: number
      day: number
      hour: number
    }>
  ): Promise<PropagationVelocity> {
    // 计算病毒系数
    const viralResult = await this.calculateViralCoefficient(statistics)

    // 计算小时增长率
    const growthResult = await this.calculateHourlyGrowthRates(statistics)

    // 判断加速阶段
    const accelerationPhase = this.determineAccelerationPhase(growthResult.hourlyGrowthRates)

    return {
      viralCoefficient: viralResult.viralCoefficient,
      hourlyGrowthRates: growthResult.hourlyGrowthRates as number[],
      peakVelocity: growthResult.peakVelocity,
      accelerationPhase,
    }
  }

  /**
   * 从数据库查询事件的小时统计数据并计算传播速度
   */
  async getPropagationVelocity(
    eventId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<PropagationVelocity | null> {
    try {
      const query = this.dataSource
        .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy(
          "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)",
          'ASC'
        )

      if (startTime) {
        query.andWhere("make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :startTime", { startTime })
      }

      if (endTime) {
        query.andWhere("make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) < :endTime", { endTime })
      }

      const statistics = await query.getMany()

      if (statistics.length === 0) {
        return null
      }

      return this.calculatePropagationVelocity(eventId, statistics)
    } catch (error) {
      logger.error('Failed to calculate propagation velocity:', error)
      throw error
    }
  }
}
