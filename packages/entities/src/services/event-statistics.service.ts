import { Injectable, Inject } from '@sker/core'
import { DataSource } from '../data-source'
import { useEntityManager } from '../use-entity-manager'
import { EventStatisticsEntity } from '../entities/event-statistics.entity'
import { EventEntity } from '../entities/event.entity'
import { PostNLPResultEntity } from '../entities/post-nlp-result.entity'
import { WeiboPostEntity } from '../entities/weibo-post.entity'
import { EventStatisticsQueries } from '../queries/event-statistics.queries'
import { logger } from '@sker/core'
import type { SentimentScore } from '../types'

interface StatisticsMetrics {
  post_count: number
  user_count: number
  comment_count: number
  repost_count: number
  like_count: number
  sentiment: SentimentScore
  hotness: number
}

interface TrendMetrics {
  growth_rate: number
  peak_hour: number
  active_users: number
}

@Injectable()
export class EventStatisticsService {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  /**
   * 计算小时级统计数据
   */
  async calculateHourlyStatistics(
    eventId: string,
    snapshotTime: Date
  ): Promise<EventStatisticsEntity | null> {
    try {
      // 计算时间范围：当前小时的开始和结束
      const startTime = new Date(snapshotTime)
      startTime.setMinutes(0, 0, 0)
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 1)

      logger.info(
        `Calculating hourly statistics for event ${eventId} from ${startTime.toISOString()} to ${endTime.toISOString()}`
      )

      // 获取基础指标
      const metrics = await this.getBasicMetrics(eventId, startTime, endTime)

      if (metrics.post_count === 0) {
        logger.info(`No posts found for event ${eventId} in time range, skipping statistics`)
        return null
      }

      // 计算情感分数
      const sentiment = await this.calculateSentiment(eventId, startTime, endTime)

      // 计算热度
      const hotness = this.calculateHotness(metrics)

      // 保存统计数据
      const statistics = await this.saveStatistics({
        event_id: eventId,
        post_count: metrics.post_count,
        user_count: metrics.user_count,
        comment_count: metrics.comment_count,
        repost_count: metrics.repost_count,
        like_count: metrics.like_count,
        sentiment,
        hotness,
        granularity: 'hourly',
        snapshot_at: startTime,
        trend_metrics: null,
      })

      logger.info(`Successfully calculated hourly statistics for event ${eventId}`)
      return statistics
    } catch (error) {
      logger.error(`Failed to calculate hourly statistics for event ${eventId}:`, error)
      throw error
    }
  }

  /**
   * 获取基础统计指标
   */
  private async getBasicMetrics(
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<StatisticsMetrics> {
    return await useEntityManager(async manager => {
      // 查询帖子数
      const postCountResult = await EventStatisticsQueries.buildPostCountQuery(
        manager.createQueryBuilder(),
        eventId,
        startTime,
        endTime
      ).getRawOne()

      // 查询用户数
      const userCountResult = await EventStatisticsQueries.buildUserCountQuery(
        manager.createQueryBuilder(),
        eventId,
        startTime,
        endTime
      ).getRawOne()

      // 查询互动数据
      const engagementResult = await EventStatisticsQueries.buildEngagementQuery(
        manager.createQueryBuilder(),
        eventId,
        startTime,
        endTime
      ).getRawOne()

      return {
        post_count: parseInt(postCountResult?.post_count || '0'),
        user_count: parseInt(userCountResult?.user_count || '0'),
        comment_count: parseInt(engagementResult?.comment_count || '0'),
        repost_count: parseInt(engagementResult?.repost_count || '0'),
        like_count: parseInt(engagementResult?.like_count || '0'),
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        hotness: 0,
      }
    })
  }

  /**
   * 计算情感分数
   */
  private async calculateSentiment(
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<SentimentScore> {
    return await useEntityManager(async manager => {
      const sentimentResults = await EventStatisticsQueries.buildSentimentQuery(
        manager.createQueryBuilder(),
        eventId,
        startTime,
        endTime
      ).getRawMany()

      let totalCount = 0
      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0

      sentimentResults.forEach((result: any) => {
        const count = parseInt(result.count || '0')
        totalCount += count

        switch (result.sentiment_type) {
          case 'positive':
            positiveCount = count
            break
          case 'negative':
            negativeCount = count
            break
          case 'neutral':
            neutralCount = count
            break
        }
      })

      if (totalCount === 0) {
        return { positive: 0, negative: 0, neutral: 0 }
      }

      return {
        positive: Number((positiveCount / totalCount).toFixed(4)),
        negative: Number((negativeCount / totalCount).toFixed(4)),
        neutral: Number((neutralCount / totalCount).toFixed(4)),
      }
    })
  }

  /**
   * 计算热度值
   */
  private calculateHotness(metrics: StatisticsMetrics): number {
    const hotness =
      metrics.post_count * 1.0 +
      metrics.comment_count * 0.5 +
      metrics.repost_count * 2.0 +
      metrics.like_count * 0.3

    return Number(hotness.toFixed(2))
  }

  /**
   * 保存统计数据
   */
  private async saveStatistics(
    data: Partial<EventStatisticsEntity>
  ): Promise<EventStatisticsEntity> {
    return await useEntityManager(async manager => {
      const existing = await manager.findOne(EventStatisticsEntity, {
        where: {
          event_id: data.event_id!,
          snapshot_at: data.snapshot_at!,
          granularity: data.granularity!,
        },
      })

      if (existing) {
        await manager.update(EventStatisticsEntity, existing.id, data)
        return { ...existing, ...data }
      }

      const statistics = manager.create(EventStatisticsEntity, data)
      return await manager.save(EventStatisticsEntity, statistics)
    })
  }

  /**
   * 计算天级统计数据（聚合小时级数据）
   */
  async calculateDailyStatistics(
    eventId: string,
    date: Date
  ): Promise<EventStatisticsEntity | null> {
    try {
      const startTime = new Date(date)
      startTime.setHours(0, 0, 0, 0)
      const endTime = new Date(startTime)
      endTime.setDate(endTime.getDate() + 1)

      logger.info(
        `Calculating daily statistics for event ${eventId} on ${startTime.toISOString()}`
      )

      const aggregated = await this.aggregateStatistics(eventId, 'hourly', startTime, endTime)

      if (!aggregated) {
        logger.info(`No hourly statistics found for event ${eventId} on ${date.toISOString()}`)
        return null
      }

      const statistics = await this.saveStatistics({
        event_id: eventId,
        ...aggregated,
        granularity: 'daily',
        snapshot_at: startTime,
      })

      logger.info(`Successfully calculated daily statistics for event ${eventId}`)
      return statistics
    } catch (error) {
      logger.error(`Failed to calculate daily statistics for event ${eventId}:`, error)
      throw error
    }
  }

  /**
   * 聚合下级粒度的统计数据
   */
  private async aggregateStatistics(
    eventId: string,
    sourceGranularity: 'hourly' | 'daily' | 'weekly',
    startTime: Date,
    endTime: Date
  ): Promise<Omit<EventStatisticsEntity, 'id' | 'event_id' | 'granularity' | 'snapshot_at' | 'created_at'> | null> {
    return await useEntityManager(async manager => {
      const result = await EventStatisticsQueries.buildAggregateStatsQuery(
        manager.createQueryBuilder(EventStatisticsEntity, 'stats'),
        eventId,
        sourceGranularity,
        startTime,
        endTime
      ).getRawOne()

      if (!result || !result.total_post_count) {
        return null
      }

      const sentimentData = await manager
        .createQueryBuilder(EventStatisticsEntity, 'stats')
        .select('AVG((stats.sentiment->>\'positive\')::float)', 'avg_positive')
        .addSelect('AVG((stats.sentiment->>\'negative\')::float)', 'avg_negative')
        .addSelect('AVG((stats.sentiment->>\'neutral\')::float)', 'avg_neutral')
        .where('stats.event_id = :eventId', { eventId })
        .andWhere('stats.granularity = :granularity', { granularity: sourceGranularity })
        .andWhere('stats.snapshot_at >= :startTime', { startTime })
        .andWhere('stats.snapshot_at < :endTime', { endTime })
        .getRawOne()

      return {
        post_count: parseInt(result.total_post_count || '0'),
        user_count: parseInt(result.total_user_count || '0'),
        comment_count: parseInt(result.total_comment_count || '0'),
        repost_count: parseInt(result.total_repost_count || '0'),
        like_count: parseInt(result.total_like_count || '0'),
        sentiment: {
          positive: Number((sentimentData?.avg_positive || 0).toFixed(4)),
          negative: Number((sentimentData?.avg_negative || 0).toFixed(4)),
          neutral: Number((sentimentData?.avg_neutral || 0).toFixed(4)),
        },
        hotness: Number((result.avg_hotness || 0).toFixed(2)),
        trend_metrics: null,
      }
    })
  }

  /**
   * 为所有活跃事件生成小时级统计
   */
  async generateHourlyStatisticsForAllEvents(snapshotTime?: Date): Promise<void> {
    const targetTime = snapshotTime || new Date()

    try {
      logger.info(`Starting hourly statistics generation for all events at ${targetTime.toISOString()}`)

      const activeEvents = await useEntityManager(async manager => {
        return manager.find(EventEntity, {
          where: { status: 'active' },
        })
      })

      logger.info(`Found ${activeEvents.length} active events`)

      const batchSize = 5
      for (let i = 0; i < activeEvents.length; i += batchSize) {
        const batch = activeEvents.slice(i, i + batchSize)
        await Promise.allSettled(
          batch.map(event => this.calculateHourlyStatistics(event.id, targetTime))
        )
      }

      logger.info('Completed hourly statistics generation for all events')
    } catch (error) {
      logger.error('Failed to generate hourly statistics for all events:', error)
      throw error
    }
  }

  /**
   * 回填历史数据
   */
  async backfillHistoricalData(
    eventId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hourly' | 'daily' = 'hourly'
  ): Promise<void> {
    try {
      logger.info(
        `Starting backfill for event ${eventId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
      )

      if (granularity === 'hourly') {
        const currentTime = new Date(startDate)
        currentTime.setMinutes(0, 0, 0)

        while (currentTime < endDate) {
          await this.calculateHourlyStatistics(eventId, currentTime)
          currentTime.setHours(currentTime.getHours() + 1)
        }
      } else if (granularity === 'daily') {
        const currentDate = new Date(startDate)
        currentDate.setHours(0, 0, 0, 0)

        while (currentDate < endDate) {
          await this.calculateDailyStatistics(eventId, currentDate)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      logger.info(`Completed backfill for event ${eventId}`)
    } catch (error) {
      logger.error(`Failed to backfill historical data for event ${eventId}:`, error)
      throw error
    }
  }
}
