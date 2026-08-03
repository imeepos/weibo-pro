import {
  WeiboPostEntity,
  PostNLPResultEntity,
  EventHourlyStatisticsEntity,
  EventEntity,
} from '@sker/entities';
import { toInt } from '../../utils/type-converter';
import { getCoordinatesFromProvinceCity } from './location-coordinates';

/**
 * 从 event_hourly_statistics 表查询统计数据，确保数据源一致性。
 * 注意：stats.year/month/day/hour 存储的是北京时间维度 (UTC+8)。
 * 使用 make_timestamp 生成时间戳后，需要减去8小时转换为 UTC 时间进行比较。
 * 添加 JOIN events 表以过滤已删除事件，确保与 EventAnalysis 页面数据一致。
 */
export async function fetchStatisticsFromTable(manager: any, start: Date, end: Date) {
  const stats = await manager
    .getRepository(EventHourlyStatisticsEntity)
    .createQueryBuilder('stats')
    .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
    .select('COALESCE(SUM(stats.post_count), 0)', 'postCount')
    .addSelect('COALESCE(SUM(stats.user_count), 0)', 'userCount')
    .addSelect('COALESCE(SUM(stats.comment_count), 0)', 'commentCount')
    .addSelect('COALESCE(SUM(stats.like_count), 0)', 'likeCount')
    .addSelect('COALESCE(SUM(stats.repost_count), 0)', 'repostCount')
    .addSelect('COALESCE(COUNT(DISTINCT stats.event_id), 0)', 'eventCount')
    .where('event.deleted_at IS NULL')
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
      { start }
    )
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
      { end }
    )
    .getRawOne();

  const postCount = toInt(stats?.postCount);
  const userCount = toInt(stats?.userCount);
  const commentCount = toInt(stats?.commentCount);
  const likeCount = toInt(stats?.likeCount);
  const repostCount = toInt(stats?.repostCount);
  const interactionCount = commentCount + likeCount + repostCount;
  const eventCount = toInt(stats?.eventCount);

  return {
    eventCount,
    postCount,
    userCount,
    interactionCount,
  };
}

/**
 * 从 EventHourlyStatisticsEntity 聚合情感数据。
 * 注意：stats.year/month/day/hour 存储的是北京时间维度 (UTC+8)。
 * 添加 JOIN events 表以过滤已删除事件，确保数据一致性。
 */
export async function fetchSentimentFromStatistics(manager: any, start: Date, end: Date): Promise<{ positive: number; negative: number; neutral: number }> {
  const stats = await manager
    .getRepository(EventHourlyStatisticsEntity)
    .createQueryBuilder('stats')
    .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
    .select('COALESCE(SUM(stats.nlp_count), 0)', 'total')
    .addSelect('COALESCE(SUM(stats.sentiment_positive), 0)', 'positive')
    .addSelect('COALESCE(SUM(stats.sentiment_negative), 0)', 'negative')
    .addSelect('COALESCE(SUM(stats.sentiment_neutral), 0)', 'neutral')
    .where('event.deleted_at IS NULL')
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
      { start }
    )
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
      { end }
    )
    .andWhere('stats.nlp_count > 0')
    .getRawOne();

  const total = toInt(stats?.total);
  const positive = toInt(stats?.positive);
  const negative = toInt(stats?.negative);
  const neutral = toInt(stats?.neutral);

  if (total === 0) {
    return { positive: 0, negative: 0, neutral: 0 };
  }

  // 计算百分比
  return {
    positive: Math.round((positive / total) * 100),
    negative: Math.round((negative / total) * 100),
    neutral: Math.round((neutral / total) * 100),
  };
}

/**
 * 从 PostNLPResultEntity 聚合情感数据（降级备选）。
 */
export async function fetchSentimentFromNLPResults(manager: any, start: Date, end: Date): Promise<{ positive: number; negative: number; neutral: number }> {
  const sentimentData = await manager
    .getRepository(PostNLPResultEntity)
    .createQueryBuilder('nlp')
    .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
    .select('COUNT(*)', 'total')
    .addSelect(
      `SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)`,
      'positiveCount'
    )
    .addSelect(
      `SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)`,
      'negativeCount'
    )
    .addSelect(
      `SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)`,
      'neutralCount'
    )
    .where('post.ingested_at >= :start', { start })
    .andWhere('post.ingested_at <= :end', { end })
    .andWhere('post.deleted_at IS NULL')
    .getRawOne();

  const total = toInt(sentimentData?.total);
  const positiveCount = toInt(sentimentData?.positiveCount);
  const negativeCount = toInt(sentimentData?.negativeCount);
  const neutralCount = toInt(sentimentData?.neutralCount);

  if (total === 0) {
    return { positive: 0, negative: 0, neutral: 0 };
  }

  return {
    positive: Math.round((positiveCount / total) * 100),
    negative: Math.round((negativeCount / total) * 100),
    neutral: Math.round((neutralCount / total) * 100),
  };
}

/**
 * 从 WeiboPostEntity 聚合地域数据。
 * 使用 post.region_name 字段。
 */
export async function fetchLocationData(manager: any, start: Date, end: Date) {
  const locationData = await manager
    .createQueryBuilder()
    .select('COALESCE(NULLIF(post.region_name, \'\'), \'未知\')', 'location')
    .addSelect('COUNT(*)', 'count')
    .from(WeiboPostEntity, 'post')
    .where('post.ingested_at >= :start', { start })
    .andWhere('post.ingested_at <= :end', { end })
    .andWhere('post.deleted_at IS NULL')
    .groupBy('location')
    .orderBy('count', 'DESC')
    .limit(20)
    .getRawMany();

  return locationData.map((item: any) => {
    const region = (item.location || '未知').replace('发布于', '').trim();
    const count = toInt(item.count);

    // 从地域名称提取坐标
    const coordinates = getCoordinatesFromProvinceCity(region, null);

    return {
      region,
      count,
      coordinates,
    };
  });
}
