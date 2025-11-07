import { Injectable, Inject } from '@sker/core';
import {
  PostNLPResultEntity,
  WeiboPostEntity,
  WeiboUserEntity,
  EventEntity,
  useEntityManager,
} from '@sker/entities';
import {
  getTimeRangeBoundaries,
  getPreviousTimeRangeBoundaries,
} from './time-range.utils';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import type { TimeRange } from './types';

export interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

@Injectable({ providedIn: 'root' })
export class ChartsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getAgeDistribution(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_AGE, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchAgeDistribution(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchAgeDistribution(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询发帖用户的年龄分布
      // 根据微博用户注册时间估算账号年龄
      const results = await manager.query(`
        WITH user_posts AS (
          SELECT DISTINCT (post.user->>'id')::bigint as uid
          FROM weibo_posts post
          WHERE post.ingested_at >= $1
            AND post.ingested_at <= $2
            AND post.deleted_at IS NULL
            AND post.user->>'id' IS NOT NULL
        ),
        user_ages AS (
          SELECT
            u.id,
            EXTRACT(YEAR FROM AGE(NOW(), u.created_at::timestamp))::integer as account_age
          FROM weibo_users u
          INNER JOIN user_posts up ON up.uid = u.id
          WHERE u.created_at IS NOT NULL
        )
        SELECT
          CASE
            WHEN account_age < 2 THEN '0-2年'
            WHEN account_age < 5 THEN '2-5年'
            WHEN account_age < 8 THEN '5-8年'
            WHEN account_age < 10 THEN '8-10年'
            ELSE '10年以上'
          END as age_range,
          COUNT(*) as count
        FROM user_ages
        GROUP BY age_range
        ORDER BY
          CASE age_range
            WHEN '0-2年' THEN 1
            WHEN '2-5年' THEN 2
            WHEN '5-8年' THEN 3
            WHEN '8-10年' THEN 4
            ELSE 5
          END
      `, [start, end]);

      const categories = results.map((r: any) => r.age_range);
      const data = results.map((r: any) => parseInt(r.count));

      return {
        categories,
        series: [
          {
            name: '用户数量',
            data
          }
        ]
      };
    });
  }

  async getGenderDistribution(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_GENDER, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchGenderDistribution(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchGenderDistribution(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询发帖用户的性别分布
      const results = await manager.query(`
        WITH user_posts AS (
          SELECT DISTINCT (post.user->>'id')::bigint as uid
          FROM weibo_posts post
          WHERE post.ingested_at >= $1
            AND post.ingested_at <= $2
            AND post.deleted_at IS NULL
            AND post.user->>'id' IS NOT NULL
        )
        SELECT
          CASE
            WHEN u.gender = 'm' THEN '男性'
            WHEN u.gender = 'f' THEN '女性'
            ELSE '未知'
          END as gender,
          COUNT(*) as count
        FROM weibo_users u
        INNER JOIN user_posts up ON up.uid = u.id
        GROUP BY u.gender
        ORDER BY count DESC
      `, [start, end]);

      const genderOrder = ['男性', '女性', '未知'];
      const genderMap = new Map<string, number>(results.map((r: any) => [r.gender, parseInt(r.count)]));

      const categories = genderOrder;
      const data: number[] = genderOrder.map(g => genderMap.get(g) ?? 0);

      return {
        categories,
        series: [
          {
            name: '用户数量',
            data
          }
        ]
      };
    });
  }

  async getSentimentTrend(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_SENTIMENT_TREND, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSentimentTrend(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchSentimentTrend(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);
      const granularity = this.getTimeGranularity(timeRange);

      const results = await manager.query(`
        SELECT
          DATE_TRUNC($1, post.ingested_at) as time_bucket,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        WHERE post.ingested_at >= $2
          AND post.ingested_at <= $3
          AND post.deleted_at IS NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `, [granularity, start, end]);

      const categories = results.map((r: any) => this.formatTimeLabel(r.time_bucket, granularity));
      const positiveData = results.map((r: any) => parseInt(r.positive));
      const negativeData = results.map((r: any) => parseInt(r.negative));
      const neutralData = results.map((r: any) => parseInt(r.neutral));

      return {
        categories,
        series: [
          { name: '正面', data: positiveData },
          { name: '负面', data: negativeData },
          { name: '中性', data: neutralData }
        ]
      };
    });
  }

  async getGeographic(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_GEOGRAPHIC, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchGeographic(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchGeographic(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询发帖用户的地理位置分布
      const results = await manager.query(`
        WITH user_posts AS (
          SELECT DISTINCT (post.user->>'id')::bigint as uid
          FROM weibo_posts post
          WHERE post.ingested_at >= $1
            AND post.ingested_at <= $2
            AND post.deleted_at IS NULL
            AND post.user->>'id' IS NOT NULL
        )
        SELECT
          COALESCE(NULLIF(u.province, ''), NULLIF(u.city, ''), NULLIF(u.location, ''), '未知') as location,
          COUNT(*) as count
        FROM weibo_users u
        INNER JOIN user_posts up ON up.uid = u.id
        GROUP BY location
        HAVING COUNT(*) > 0
        ORDER BY count DESC
        LIMIT 20
      `, [start, end]);

      const categories = results.map((r: any) => r.location);
      const data = results.map((r: any) => parseInt(r.count));

      return {
        categories,
        series: [
          {
            name: '用户数量',
            data
          }
        ]
      };
    });
  }

  async getEventTypes(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_EVENT_TYPES, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchEventTypes(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchEventTypes(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询事件分类统计
      const results = await manager.query(`
        SELECT
          COALESCE(c.name, '未分类') as category,
          COUNT(*) as count
        FROM events e
        LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.created_at >= $1
          AND e.created_at <= $2
          AND e.deleted_at IS NULL
        GROUP BY c.name
        ORDER BY count DESC
      `, [start, end]);

      const categories = results.map((r: any) => r.category);
      const data = results.map((r: any) => parseInt(r.count));

      return {
        categories,
        series: [
          {
            name: '事件数量',
            data
          }
        ]
      };
    });
  }

  async getWordCloud(timeRange: TimeRange = '12h', limit: number = 50) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_WORDCLOUD, timeRange, limit);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchWordCloud(timeRange, limit),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchWordCloud(timeRange: TimeRange, limit: number) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 从 NLP 结果提取关键词并聚合
      const results = await manager.query(`
        SELECT
          keyword_elem->>'keyword' as keyword,
          keyword_elem->>'sentiment' as sentiment,
          COUNT(*) as count,
          AVG((keyword_elem->>'weight')::numeric) as weight
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        CROSS JOIN jsonb_array_elements(nlp.keywords) as keyword_elem
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
        GROUP BY keyword_elem->>'keyword', keyword_elem->>'sentiment'
        ORDER BY count DESC
        LIMIT $3
      `, [start, end, limit]);

      return results.map((row: any) => ({
        keyword: row.keyword,
        count: parseInt(row.count),
        sentiment: row.sentiment,
        weight: parseFloat(row.weight || '0'),
      }));
    });
  }

  async getEventCountSeries(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_EVENT_COUNT, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchEventCountSeries(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchEventCountSeries(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);
      const granularity = this.getTimeGranularity(timeRange);

      const results = await manager.query(`
        SELECT
          DATE_TRUNC($1, e.created_at) as time_bucket,
          COUNT(*) as count
        FROM events e
        WHERE e.created_at >= $2
          AND e.created_at <= $3
          AND e.deleted_at IS NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `, [granularity, start, end]);

      const categories = results.map((r: any) => this.formatTimeLabel(r.time_bucket, granularity));
      const data = results.map((r: any) => parseInt(r.count));

      return {
        categories,
        series: [{ name: '事件数量', data }]
      };
    });
  }

  async getPostCountSeries(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_POST_COUNT, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchPostCountSeries(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchPostCountSeries(timeRange: TimeRange): Promise<ChartData> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);
      const granularity = this.getTimeGranularity(timeRange);

      const results = await manager.query(`
        SELECT
          DATE_TRUNC($1, post.ingested_at) as time_bucket,
          COUNT(*) as count
        FROM weibo_posts post
        WHERE post.ingested_at >= $2
          AND post.ingested_at <= $3
          AND post.deleted_at IS NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `, [granularity, start, end]);

      const categories = results.map((r: any) => this.formatTimeLabel(r.time_bucket, granularity));
      const data = results.map((r: any) => parseInt(r.count));

      return {
        categories,
        series: [{ name: '帖子数量', data }]
      };
    });
  }

  async getSentimentData(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_SENTIMENT_DATA, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSentimentData(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchSentimentData(timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const result = await manager.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
      `, [start, end]);

      const row = result[0];
      const total = parseInt(row.total) || 0;
      const positive = parseInt(row.positive) || 0;
      const negative = parseInt(row.negative) || 0;
      const neutral = parseInt(row.neutral) || 0;

      return {
        positive,
        negative,
        neutral,
        total
      };
    });
  }

  async getBatchCharts(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_BATCH, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [
          ageDistribution,
          genderDistribution,
          sentimentTrend,
          geographic,
          eventTypes,
          wordCloud
        ] = await Promise.all([
          this.getAgeDistribution(timeRange),
          this.getGenderDistribution(timeRange),
          this.getSentimentTrend(timeRange),
          this.getGeographic(timeRange),
          this.getEventTypes(timeRange),
          this.getWordCloud(timeRange)
        ]);

        return {
          ageDistribution,
          genderDistribution,
          sentimentTrend,
          geographic,
          eventTypes,
          wordCloud
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  // Helper methods
  private getTimeGranularity(timeRange: TimeRange): string {
    const granularityMap: Record<TimeRange, string> = {
      '1h': 'hour',
      '6h': 'hour',
      '12h': 'hour',
      '24h': 'hour',
      '7d': 'day',
      '30d': 'day',
      '90d': 'week',
      '180d': 'week',
      '365d': 'month',
    };
    return granularityMap[timeRange] || 'day';
  }

  private formatTimeLabel(timestamp: Date, granularity: string): string {
    const date = new Date(timestamp);

    switch (granularity) {
      case 'hour':
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
      case 'day':
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      case 'week':
        return `第${Math.ceil(date.getDate() / 7)}周`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0]!;
    }
  }
}