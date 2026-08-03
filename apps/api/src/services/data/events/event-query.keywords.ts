import { useEntityManager, PostNLPResultEntity } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type {
  EventKeywordTimeSeries,
  EventKeywordBySentiment,
  EventNegativeKeywordAlert,
} from './types';

/**
 * 事件关键词查询模块
 *
 * 基于 PostNLPResultEntity 的关键词分析查询：
 * - 关键词权重列表（getEventKeywords）
 * - 关键词时间序列（getKeywordsTimeSeries）
 * - 按情感分类的关键词（getKeywordsBySentiment）
 * - 负面关键词告警（getNegativeKeywords）
 */
export class EventKeywordQueries {
  constructor(private readonly cacheService: CacheService) {}

  async getEventKeywords(
    eventId: string,
    limit: number = 1000
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    const cacheKey = CacheService.buildKey('event:keywords', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<
            string,
            { totalWeight: number; sentiment: string; count: number }
          >();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            keywords.forEach((kw) => {
              const existing = keywordMap.get(kw.keyword);
              if (existing) {
                existing.totalWeight += kw.weight;
                existing.count += 1;
              } else {
                keywordMap.set(kw.keyword, {
                  totalWeight: kw.weight,
                  sentiment: kw.sentiment || 'neutral',
                  count: 1,
                });
              }
            });
          });

          return Array.from(keywordMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              weight: Math.round(data.totalWeight * 100) / 100,
              sentiment: data.sentiment,
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, limit);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getKeywordsTimeSeries(eventId: string, topN: number = 20): Promise<EventKeywordTimeSeries[]> {
    const cacheKey = CacheService.buildKey('event:keywords_timeseries', eventId, topN.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .orderBy('nlp.created_at', 'ASC')
            .getMany();

          const keywordTimeMap = new Map<string, Array<{ timestamp: string; weight: number }>>();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            const timestamp = result.created_at.toISOString();

            keywords.forEach((kw) => {
              if (!keywordTimeMap.has(kw.keyword)) {
                keywordTimeMap.set(kw.keyword, []);
              }
              keywordTimeMap.get(kw.keyword)!.push({ timestamp, weight: kw.weight });
            });
          });

          const topKeywords = Array.from(keywordTimeMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              totalWeight: data.reduce((sum, d) => sum + d.weight, 0),
            }))
            .sort((a, b) => b.totalWeight - a.totalWeight)
            .slice(0, topN)
            .map((k) => k.keyword);

          return topKeywords.map((keyword) => ({
            keyword,
            timeData: keywordTimeMap.get(keyword)!,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getKeywordsBySentiment(eventId: string): Promise<EventKeywordBySentiment[]> {
    const cacheKey = CacheService.buildKey('event:keywords_by_sentiment', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<string, { totalWeight: number; sentiment: string; count: number }>();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            keywords.forEach((kw) => {
              const existing = keywordMap.get(kw.keyword);
              if (existing) {
                existing.totalWeight += kw.weight;
                existing.count += 1;
              } else {
                keywordMap.set(kw.keyword, {
                  totalWeight: kw.weight,
                  sentiment: kw.sentiment || 'neutral',
                  count: 1,
                });
              }
            });
          });

          return Array.from(keywordMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              weight: Math.round(data.totalWeight * 100) / 100,
              sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
              count: data.count,
            }))
            .sort((a, b) => b.weight - a.weight);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getNegativeKeywords(eventId: string, threshold: number = 0.5): Promise<EventNegativeKeywordAlert[]> {
    const cacheKey = CacheService.buildKey('event:negative_keywords', eventId, threshold.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const keywordsBySentiment = await this.getKeywordsBySentiment(eventId);

        return keywordsBySentiment
          .filter((kw) => kw.sentiment === 'negative' && kw.weight >= threshold)
          .map((kw) => ({
            keyword: kw.keyword,
            weight: kw.weight,
            count: kw.count,
            trend: 'stable' as const,
          }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 20);
      },
      CACHE_TTL.SHORT
    );
  }
}
