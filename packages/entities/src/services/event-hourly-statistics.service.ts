import { Injectable } from '@sker/core'
import { SelectQueryBuilder } from 'typeorm'
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity'
import { useEntityManager } from '../utils'
import type { SentimentScore } from '../types/sentiment'

export interface StatisticsResult {
  id: string
  event_id: string
  post_count: number
  user_count: number
  comment_count: number
  repost_count: number
  like_count: number
  sentiment: SentimentScore
  hotness: number
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  snapshot_at: Date
  trend_metrics: null
  created_at: Date
}

type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly'

@Injectable()
export class EventHourlyStatisticsService {
  async queryStatistics(
    eventId: string,
    granularity: Granularity,
    startTime: Date,
    endTime: Date
  ): Promise<StatisticsResult[]> {
    return await useEntityManager(async (manager) => {
      const query = this.buildStatisticsQuery(
        manager,
        eventId,
        granularity,
        startTime,
        endTime
      )
      const rawResults = await query.getRawMany()

      return rawResults.map(this.mapRawToStatistics)
    })
  }

  async getLatestStatistics(eventId: string): Promise<StatisticsResult | null> {
    return await useEntityManager(async (manager) => {
      const result = await manager
        .getRepository(EventHourlyStatisticsEntity)
        .createQueryBuilder('stats')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy(
          "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)",
          'DESC'
        )
        .limit(1)
        .getRawOne()

      return result ? this.mapRawToStatistics(result) : null
    })
  }

  async getAllEventStatistics(eventId: string): Promise<StatisticsResult[]> {
    return await useEntityManager(async (manager) => {
      const results = await manager
        .getRepository(EventHourlyStatisticsEntity)
        .createQueryBuilder('stats')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy(
          "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)",
          'ASC'
        )
        .getRawMany()

      return results.map(this.mapRawToStatistics)
    })
  }

  private buildStatisticsQuery(
    manager: any,
    eventId: string,
    granularity: Granularity,
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<EventHourlyStatisticsEntity> {
    const qb = manager
      .getRepository(EventHourlyStatisticsEntity)
      .createQueryBuilder('stats')

    const timeExpression = `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)`

    switch (granularity) {
      case 'hourly':
        return this.buildHourlyQuery(qb, eventId, startTime, endTime, timeExpression)
      case 'daily':
        return this.buildDailyQuery(qb, eventId, startTime, endTime, timeExpression)
      case 'weekly':
        return this.buildWeeklyQuery(qb, eventId, startTime, endTime, timeExpression)
      case 'monthly':
        return this.buildMonthlyQuery(qb, eventId, startTime, endTime, timeExpression)
    }
  }

  private buildHourlyQuery(
    qb: SelectQueryBuilder<EventHourlyStatisticsEntity>,
    eventId: string,
    startTime: Date,
    endTime: Date,
    timeExpression: string
  ): SelectQueryBuilder<EventHourlyStatisticsEntity> {
    return qb
      .select([
        'stats.id',
        'stats.event_id',
        'stats.post_count',
        'stats.user_count',
        'stats.comment_count',
        'stats.repost_count',
        'stats.like_count',
        'stats.sentiment_positive',
        'stats.sentiment_negative',
        'stats.sentiment_neutral',
        'stats.hotness',
        'stats.year',
        'stats.month',
        'stats.day',
        'stats.hour',
        'stats.created_at',
      ])
      .where('stats.event_id = :eventId', { eventId })
      .andWhere(`${timeExpression} >= :startTime`, { startTime })
      .andWhere(`${timeExpression} < :endTime`, { endTime })
      .orderBy(timeExpression, 'ASC')
  }

  private buildDailyQuery(
    qb: SelectQueryBuilder<EventHourlyStatisticsEntity>,
    eventId: string,
    startTime: Date,
    endTime: Date,
    timeExpression: string
  ): SelectQueryBuilder<EventHourlyStatisticsEntity> {
    return qb
      .select([
        'MAX(stats.id)',
        'stats.event_id',
        'SUM(stats.post_count)',
        'SUM(stats.user_count)',
        'SUM(stats.comment_count)',
        'SUM(stats.repost_count)',
        'SUM(stats.like_count)',
        'AVG(stats.sentiment_positive)',
        'AVG(stats.sentiment_negative)',
        'AVG(stats.sentiment_neutral)',
        'AVG(stats.hotness)',
        'stats.year',
        'stats.month',
        'stats.day',
        '0',
        'MAX(stats.created_at)',
      ])
      .where('stats.event_id = :eventId', { eventId })
      .andWhere(`${timeExpression} >= :startTime`, { startTime })
      .andWhere(`${timeExpression} < :endTime`, { endTime })
      .groupBy('stats.event_id, stats.year, stats.month, stats.day')
      .orderBy('stats.year, stats.month, stats.day', 'ASC')
  }

  private buildWeeklyQuery(
    qb: SelectQueryBuilder<EventHourlyStatisticsEntity>,
    eventId: string,
    startTime: Date,
    endTime: Date,
    timeExpression: string
  ): SelectQueryBuilder<EventHourlyStatisticsEntity> {
    return qb
      .select([
        'MAX(stats.id)',
        'stats.event_id',
        'SUM(stats.post_count)',
        'SUM(stats.user_count)',
        'SUM(stats.comment_count)',
        'SUM(stats.repost_count)',
        'SUM(stats.like_count)',
        'AVG(stats.sentiment_positive)',
        'AVG(stats.sentiment_negative)',
        'AVG(stats.sentiment_neutral)',
        'AVG(stats.hotness)',
        'stats.year',
        'EXTRACT(WEEK FROM make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0))',
        '0',
        'MAX(stats.created_at)',
      ])
      .where('stats.event_id = :eventId', { eventId })
      .andWhere(`${timeExpression} >= :startTime`, { startTime })
      .andWhere(`${timeExpression} < :endTime`, { endTime })
      .groupBy('stats.event_id, stats.year, EXTRACT(WEEK FROM make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0))')
      .orderBy('stats.year, EXTRACT(WEEK FROM make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0))', 'ASC')
  }

  private buildMonthlyQuery(
    qb: SelectQueryBuilder<EventHourlyStatisticsEntity>,
    eventId: string,
    startTime: Date,
    endTime: Date,
    timeExpression: string
  ): SelectQueryBuilder<EventHourlyStatisticsEntity> {
    return qb
      .select([
        'MAX(stats.id)',
        'stats.event_id',
        'SUM(stats.post_count)',
        'SUM(stats.user_count)',
        'SUM(stats.comment_count)',
        'SUM(stats.repost_count)',
        'SUM(stats.like_count)',
        'AVG(stats.sentiment_positive)',
        'AVG(stats.sentiment_negative)',
        'AVG(stats.sentiment_neutral)',
        'AVG(stats.hotness)',
        'stats.year',
        'stats.month',
        '0',
        '0',
        'MAX(stats.created_at)',
      ])
      .where('stats.event_id = :eventId', { eventId })
      .andWhere(`${timeExpression} >= :startTime`, { startTime })
      .andWhere(`${timeExpression} < :endTime`, { endTime })
      .groupBy('stats.event_id, stats.year, stats.month')
      .orderBy('stats.year, stats.month', 'ASC')
  }

  private mapRawToStatistics = (raw: any): StatisticsResult => {
    const sentiment: SentimentScore = {
      positive: parseFloat(raw.sentiment_positive || '0'),
      negative: parseFloat(raw.sentiment_negative || '0'),
      neutral: parseFloat(raw.sentiment_neutral || '0'),
    }

    const snapshotAt = new Date(
      Date.UTC(
        parseInt(raw.year || '0'),
        parseInt(raw.month || '1') - 1,
        parseInt(raw.day || '1'),
        parseInt(raw.hour || '0'),
        0,
        0
      )
    )

    return {
      id: raw.stats_id || raw.max || raw.id,
      event_id: raw.stats_event_id || raw.event_id,
      post_count: parseInt(raw.stats_post_count || raw.post_count || raw.sum || '0'),
      user_count: parseInt(raw.stats_user_count || raw.user_count || '0'),
      comment_count: parseInt(raw.stats_comment_count || raw.comment_count || '0'),
      repost_count: parseInt(raw.stats_repost_count || raw.repost_count || '0'),
      like_count: parseInt(raw.stats_like_count || raw.like_count || '0'),
      sentiment,
      hotness: parseFloat(raw.stats_hotness || raw.hotness || '0'),
      granularity: 'hourly',
      snapshot_at: snapshotAt,
      trend_metrics: null,
      created_at: raw.stats_created_at || raw.created_at || new Date(),
    }
  }
}
