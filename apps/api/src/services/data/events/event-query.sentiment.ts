import { useEntityManager, PostNLPResultEntity, EventHourlyStatisticsEntity } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type {
  EventSentimentHotness,
  EventSentimentDistribution,
  EventSentimentIntensity,
  EventEventTypeDistribution,
} from './types';

/**
 * 事件情感与类型分析模块
 *
 * 基于 PostNLPResultEntity 与 EventHourlyStatisticsEntity 的情感/类型分析查询：
 * - 帖子级情感热度（getSentimentHotness）
 * - 情感分布（getSentimentDistribution）
 * - 情感强度分布（getSentimentIntensity）
 * - 事件类型分布（getEventTypes）
 */
export class EventSentimentQueries {
  constructor(private readonly cacheService: CacheService) {}

  async getSentimentHotness(eventId: string): Promise<EventSentimentHotness[]> {
    const cacheKey = CacheService.buildKey('event:sentiment_hotness', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          // 获取 NLP 结果和帖子互动数据，计算每个帖子的热度
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .select('nlp.post_id', 'postId')
            .addSelect(
              '(nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric',
              'sentimentScore'
            )
            .addSelect('COALESCE(post.reposts_count, 0)', 'reposts')
            .addSelect('COALESCE(post.comments_count, 0)', 'comments')
            .addSelect('COALESCE(post.attitudes_count, 0)', 'attitudes')
            .addSelect('nlp.created_at', 'timestamp')
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .orderBy('nlp.created_at', 'DESC')
            .limit(500)
            .getRawMany();

          // 计算热度值：转发权重最高，评论次之，点赞最低
          // 使用对数缩放避免极端值，同时保留差异
          return results.map((row: {
            postId: string;
            sentimentScore: string;
            reposts: string;
            comments: string;
            attitudes: string;
            timestamp: Date;
          }) => {
            const reposts = parseFloat(row.reposts || '0');
            const comments = parseFloat(row.comments || '0');
            const attitudes = parseFloat(row.attitudes || '0');

            // 热度计算公式：转发*5 + 评论*2 + 点赞*1
            // 使用 Math.log1p 避免对数计算时的极端值
            const rawHotness = reposts * 5 + comments * 2 + attitudes * 1;

            // 使用对数缩放，加 1 避免log(0)，结果范围约在 0-100 之间
            const hotness = rawHotness > 0
              ? Math.min(100, Math.log10(rawHotness + 1) * 25)
              : 0;

            return {
              postId: row.postId,
              sentimentScore: parseFloat(row.sentimentScore || '0'),
              hotness: Math.round(hotness * 100) / 100,
              timestamp: row.timestamp.toISOString(),
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentDistribution(eventId: string): Promise<EventSentimentDistribution> {
    const cacheKey = CacheService.buildKey('event:sentiment_distribution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.sentiment->>\'overall\'', 'overall')
            .addSelect('COUNT(*)', 'count')
            .where('nlp.event_id = :eventId', { eventId })
            .groupBy('nlp.sentiment->>\'overall\'')
            .getRawMany();

          const distribution = {
            positive: { count: 0, percentage: 0 },
            negative: { count: 0, percentage: 0 },
            neutral: { count: 0, percentage: 0 },
          };

          let total = 0;
          results.forEach((row: { overall: string; count: string }) => {
            const count = parseInt(row.count || '0', 10);
            total += count;
            if (row.overall in distribution) {
              distribution[row.overall as keyof typeof distribution].count = count;
            }
          });

          if (total > 0) {
            distribution.positive.percentage = Math.round((distribution.positive.count / total) * 10000) / 100;
            distribution.negative.percentage = Math.round((distribution.negative.count / total) * 10000) / 100;
            distribution.neutral.percentage = Math.round((distribution.neutral.count / total) * 10000) / 100;
          }

          return distribution;
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentIntensity(eventId: string): Promise<EventSentimentIntensity[]> {
    return await useEntityManager(async (entityManager) => {
      const stats = await entityManager
        .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
        .select('stats.sentiment_positive', 'positive')
        .addSelect('stats.sentiment_negative', 'negative')
        .addSelect('stats.sentiment_neutral', 'neutral')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy('stats.year', 'DESC')
        .addOrderBy('stats.month', 'DESC')
        .addOrderBy('stats.day', 'DESC')
        .addOrderBy('stats.hour', 'DESC')
        .limit(168)
        .getRawMany();

      const intensityMap = new Map<number, number>();

      stats.forEach((row: any) => {
        const positive = parseFloat(row.positive || '0');
        const negative = parseFloat(row.negative || '0');
        const neutral = parseFloat(row.neutral || '0');
        const total = positive + negative + neutral;

        if (total > 0) {
          const intensity = Math.abs(positive - negative) / total;
          const bucket = Math.round(intensity * 10) / 10;
          intensityMap.set(bucket, (intensityMap.get(bucket) || 0) + 1);
        }
      });

      return Array.from(intensityMap.entries())
        .map(([intensity, count]) => ({
          intensity,
          count
        }))
        .sort((a, b) => a.intensity - b.intensity);
    });
  }

  async getEventTypes(eventId: string): Promise<EventEventTypeDistribution[]> {
    const cacheKey = CacheService.buildKey('event:event_types', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.event_type->>\'type\'', 'eventType')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG((nlp.event_type->>\'confidence\')::numeric)', 'avgConfidence')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgSentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere("nlp.event_type->>'type' IS NOT NULL")
            .andWhere("nlp.event_type->>'type' != ''")
            .groupBy('nlp.event_type->>\'type\'')
            .orderBy('count', 'DESC')
            .getRawMany();

          return results.map((row: {
            eventType: string;
            count: string;
            avgConfidence: string;
            avgSentiment: string;
          }) => ({
            eventType: row.eventType || '未知',
            count: parseInt(row.count || '0', 10),
            confidence: Math.round(parseFloat(row.avgConfidence || '0') * 100) / 100,
            avgSentiment: Math.round(parseFloat(row.avgSentiment || '0') * 100) / 100,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }
}
