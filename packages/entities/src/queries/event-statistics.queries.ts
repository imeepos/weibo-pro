import { SelectQueryBuilder } from 'typeorm'
import { EventStatisticsEntity } from '../event-statistics.entity'
import { PostNLPResultEntity } from '../post-nlp-result.entity'
import { WeiboPostEntity } from '../weibo-post.entity'

export class EventStatisticsQueries {
  /**
   * 查询事件在指定时间范围内的帖子统计
   */
  static buildPostCountQuery(
    qb: SelectQueryBuilder<any>,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<any> {
    return qb
      .select('COUNT(DISTINCT nlp.post_id)', 'post_count')
      .from(PostNLPResultEntity, 'nlp')
      .where('nlp.event_id = :eventId', { eventId })
      .andWhere('nlp.created_at >= :startTime', { startTime })
      .andWhere('nlp.created_at < :endTime', { endTime })
  }

  /**
   * 查询事件在指定时间范围内的用户统计
   */
  static buildUserCountQuery(
    qb: SelectQueryBuilder<any>,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<any> {
    return qb
      .select('COUNT(DISTINCT post.user->>\'id\')', 'user_count')
      .from(PostNLPResultEntity, 'nlp')
      .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
      .where('nlp.event_id = :eventId', { eventId })
      .andWhere('nlp.created_at >= :startTime', { startTime })
      .andWhere('nlp.created_at < :endTime', { endTime })
  }

  /**
   * 查询事件在指定时间范围内的互动统计
   */
  static buildEngagementQuery(
    qb: SelectQueryBuilder<any>,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<any> {
    return qb
      .select('SUM(COALESCE(post.comments_count, 0))', 'comment_count')
      .addSelect('SUM(COALESCE(post.reposts_count, 0))', 'repost_count')
      .addSelect('SUM(COALESCE(post.attitudes_count, 0))', 'like_count')
      .from(PostNLPResultEntity, 'nlp')
      .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
      .where('nlp.event_id = :eventId', { eventId })
      .andWhere('nlp.created_at >= :startTime', { startTime })
      .andWhere('nlp.created_at < :endTime', { endTime })
  }

  /**
   * 查询事件在指定时间范围内的情感分布
   */
  static buildSentimentQuery(
    qb: SelectQueryBuilder<any>,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<any> {
    return qb
      .select('nlp.sentiment->>\'overall\'', 'sentiment_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG((nlp.sentiment->>\'confidence\')::float)', 'avg_confidence')
      .from(PostNLPResultEntity, 'nlp')
      .where('nlp.event_id = :eventId', { eventId })
      .andWhere('nlp.created_at >= :startTime', { startTime })
      .andWhere('nlp.created_at < :endTime', { endTime })
      .groupBy('nlp.sentiment->>\'overall\'')
  }

  /**
   * 查询指定粒度的历史统计数据
   */
  static buildHistoricalStatsQuery(
    qb: SelectQueryBuilder<EventStatisticsEntity>,
    eventId: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<EventStatisticsEntity> {
    return qb
      .where('stats.event_id = :eventId', { eventId })
      .andWhere('stats.granularity = :granularity', { granularity })
      .andWhere('stats.snapshot_at >= :startTime', { startTime })
      .andWhere('stats.snapshot_at < :endTime', { endTime })
      .orderBy('stats.snapshot_at', 'ASC')
  }

  /**
   * 聚合下级粒度的统计数据
   */
  static buildAggregateStatsQuery(
    qb: SelectQueryBuilder<EventStatisticsEntity>,
    eventId: string,
    sourceGranularity: 'hourly' | 'daily' | 'weekly',
    startTime: Date,
    endTime: Date
  ): SelectQueryBuilder<EventStatisticsEntity> {
    return qb
      .select('SUM(stats.post_count)', 'total_post_count')
      .addSelect('SUM(stats.user_count)', 'total_user_count')
      .addSelect('SUM(stats.comment_count)', 'total_comment_count')
      .addSelect('SUM(stats.repost_count)', 'total_repost_count')
      .addSelect('SUM(stats.like_count)', 'total_like_count')
      .addSelect('AVG(stats.hotness)', 'avg_hotness')
      .addSelect('MAX(stats.hotness)', 'max_hotness')
      .where('stats.event_id = :eventId', { eventId })
      .andWhere('stats.granularity = :granularity', { granularity: sourceGranularity })
      .andWhere('stats.snapshot_at >= :startTime', { startTime })
      .andWhere('stats.snapshot_at < :endTime', { endTime })
  }
}
