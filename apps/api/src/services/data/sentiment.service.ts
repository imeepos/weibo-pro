import { Injectable, Inject } from '@sker/core';
import {
  PostNLPResultEntity,
  WeiboPostEntity,
  useEntityManager,
} from '@sker/entities';
import {
  getTimeRangeBoundaries,
  getPreviousTimeRangeBoundaries,
  calculateChangeRate,
} from './time-range.utils';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import type { TimeRange } from './types';

// 情感统计数据接口
export interface SentimentStatistics {
  totalAnalyzed: number;
  positive: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  negative: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  neutral: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  overallScore: number;
  confidenceLevel: number;
}

// 实时情感数据接口
export interface SentimentRealTimeData {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  trend: {
    positive: 'up' | 'down' | 'stable';
    negative: 'up' | 'down' | 'stable';
    neutral: 'up' | 'down' | 'stable';
  };
}

@Injectable({ providedIn: 'root' })
export class SentimentService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  // 获取实时情感数据
  async getRealtimeData(timeRange: TimeRange = '12h'): Promise<SentimentRealTimeData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_REALTIME, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchRealtimeData(timeRange),
      CACHE_TTL.SHORT // 实时数据: 60秒缓存
    );
  }

  private async fetchRealtimeData(timeRange: TimeRange): Promise<SentimentRealTimeData> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      // 当前时段数据
      const currentCounts = await this.fetchSentimentCounts(manager, current.start, current.end);

      // 上一时段数据（用于趋势计算）
      const previousCounts = await this.fetchSentimentCounts(manager, previous.start, previous.end);

      return {
        timestamp: new Date().toISOString(),
        positive: currentCounts.positive,
        negative: currentCounts.negative,
        neutral: currentCounts.neutral,
        total: currentCounts.total,
        trend: {
          positive: this.calculateTrend(currentCounts.positive, previousCounts.positive),
          negative: this.calculateTrend(currentCounts.negative, previousCounts.negative),
          neutral: this.calculateTrend(currentCounts.neutral, previousCounts.neutral),
        },
      };
    });
  }

  // 获取情感统计数据
  async getStatistics(timeRange: TimeRange = '12h'): Promise<SentimentStatistics> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_STATS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchStatistics(timeRange),
      CACHE_TTL.MEDIUM // 统计数据: 5分钟缓存
    );
  }

  private async fetchStatistics(timeRange: TimeRange): Promise<SentimentStatistics> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询情感分布和分数
      const result = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
        .select('COUNT(*)', 'total')
        .addSelect(
          "SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)",
          'positive_count'
        )
        .addSelect(
          "SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)",
          'negative_count'
        )
        .addSelect(
          "SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)",
          'neutral_count'
        )
        .addSelect(
          "AVG((nlp.sentiment->>'positive_prob')::numeric)",
          'positive_avg'
        )
        .addSelect(
          "AVG((nlp.sentiment->>'negative_prob')::numeric)",
          'negative_avg'
        )
        .addSelect(
          "AVG((nlp.sentiment->>'neutral_prob')::numeric)",
          'neutral_avg'
        )
        .addSelect(
          "AVG((nlp.sentiment->>'confidence')::numeric)",
          'confidence_avg'
        )
        .where('post.ingested_at >= :start', { start })
        .andWhere('post.ingested_at <= :end', { end })
        .andWhere('post.deleted_at IS NULL')
        .getRawOne();

      const total = parseInt(result.total || '0');
      const positiveCount = parseInt(result.positive_count || '0');
      const negativeCount = parseInt(result.negative_count || '0');
      const neutralCount = parseInt(result.neutral_count || '0');

      // 计算百分比
      const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
      const negativePercentage = total > 0 ? Math.round((negativeCount / total) * 100) : 0;
      const neutralPercentage = total > 0 ? Math.round((neutralCount / total) * 100) : 0;

      // 计算综合情感得分 (-1 到 1)
      const overallScore = total > 0
        ? (positiveCount - negativeCount) / total
        : 0;

      return {
        totalAnalyzed: total,
        positive: {
          count: positiveCount,
          percentage: positivePercentage,
          avgScore: parseFloat(result.positive_avg || '0'),
        },
        negative: {
          count: negativeCount,
          percentage: negativePercentage,
          avgScore: parseFloat(result.negative_avg || '0'),
        },
        neutral: {
          count: neutralCount,
          percentage: neutralPercentage,
          avgScore: parseFloat(result.neutral_avg || '0'),
        },
        overallScore: Number(overallScore.toFixed(2)),
        confidenceLevel: parseFloat(result.confidence_avg || '0'),
      };
    });
  }

  // 辅助方法：查询情感计数
  private async fetchSentimentCounts(manager: any, start: Date, end: Date) {
    const result = await manager
      .getRepository(PostNLPResultEntity)
      .createQueryBuilder('nlp')
      .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)",
        'positive'
      )
      .addSelect(
        "SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)",
        'negative'
      )
      .addSelect(
        "SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)",
        'neutral'
      )
      .where('post.ingested_at >= :start', { start })
      .andWhere('post.ingested_at <= :end', { end })
      .andWhere('post.deleted_at IS NULL')
      .getRawOne();

    return {
      total: parseInt(result.total || '0'),
      positive: parseInt(result.positive || '0'),
      negative: parseInt(result.negative || '0'),
      neutral: parseInt(result.neutral || '0'),
    };
  }

  // 辅助方法：计算趋势
  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const changeRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    if (Math.abs(changeRate) < 5) return 'stable';
    return changeRate > 0 ? 'up' : 'down';
  }

  // 获取关键词云数据
  async getKeywords(timeRange: TimeRange = '12h', limit: number = 50) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_KEYWORDS, timeRange, limit);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchKeywords(timeRange, limit),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchKeywords(timeRange: TimeRange, limit: number) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 使用原生 SQL 查询展开 JSONB 数组
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

  // 获取热点话题
  async getHotTopics(timeRange: TimeRange = '12h', limit: number = 10) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_HOT_TOPICS, timeRange, limit);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchHotTopics(timeRange, limit),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchHotTopics(timeRange: TimeRange, limit: number) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 聚合关键词作为话题
      const results = await manager.query(`
        SELECT
          keyword_elem->>'keyword' as topic,
          COUNT(DISTINCT nlp.post_id) as post_count,
          COUNT(DISTINCT post.user->>'id') as user_count,
          keyword_elem->>'sentiment' as sentiment,
          AVG((keyword_elem->>'weight')::numeric) as heat_score
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        CROSS JOIN jsonb_array_elements(nlp.keywords) as keyword_elem
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
        GROUP BY keyword_elem->>'keyword', keyword_elem->>'sentiment'
        ORDER BY post_count DESC
        LIMIT $3
      `, [start, end, limit]);

      return results.map((row: any, index: number) => ({
        id: `topic_${index + 1}`,
        topic: row.topic,
        sentiment: row.sentiment,
        heat: Math.round(parseFloat(row.heat_score || '0') * 100),
        posts: parseInt(row.post_count),
        users: parseInt(row.user_count),
      }));
    });
  }

  // 获取时间序列数据
  async getTimeSeries(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_TIME_SERIES, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchTimeSeries(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchTimeSeries(timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 根据时间范围选择合适的时间粒度
      const granularity = this.getTimeGranularity(timeRange);

      const results = await manager.query(`
        SELECT
          DATE_TRUNC($1, post.ingested_at) as time_bucket,
          COUNT(*) as total,
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

      return results.map((row: any) => ({
        timestamp: row.time_bucket,
        positive: parseInt(row.positive),
        negative: parseInt(row.negative),
        neutral: parseInt(row.neutral),
        total: parseInt(row.total),
      }));
    });
  }

  // 获取地理位置分布
  async getLocations(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_LOCATIONS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchLocations(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchLocations(timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const results = await manager.query(`
        SELECT
          COALESCE(
            NULLIF(post.region_name, ''),
            NULLIF(post.user->>'location', ''),
            '未知'
          ) as region,
          COUNT(*) as total,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
        GROUP BY region
        ORDER BY total DESC
        LIMIT 20
      `, [start, end]);

      return results.map((row: any) => ({
        region: row.region,
        positive: parseInt(row.positive),
        negative: parseInt(row.negative),
        neutral: parseInt(row.neutral),
        total: parseInt(row.total),
      }));
    });
  }

  // 获取最新帖子
  async getRecentPosts(timeRange: TimeRange = '12h', limit: number = 20) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_RECENT_POSTS, timeRange, limit);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchRecentPosts(timeRange, limit),
      CACHE_TTL.SHORT
    );
  }

  private async fetchRecentPosts(timeRange: TimeRange, limit: number) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const results = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
        .select('post.id', 'id')
        .addSelect('post.text', 'content')
        .addSelect("nlp.sentiment->>'overall'", 'sentiment')
        .addSelect("nlp.sentiment->>'confidence'", 'confidence')
        .addSelect("post.user->>'screen_name'", 'author')
        .addSelect('post.attitudes_count', 'likes')
        .addSelect('post.comments_count', 'comments')
        .addSelect('post.ingested_at', 'timestamp')
        .where('post.ingested_at >= :start', { start })
        .andWhere('post.ingested_at <= :end', { end })
        .andWhere('post.deleted_at IS NULL')
        .orderBy('post.ingested_at', 'DESC')
        .limit(limit)
        .getRawMany();

      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        sentiment: row.sentiment,
        confidence: parseFloat(row.confidence || '0'),
        author: row.author || '未知用户',
        likes: row.likes || 0,
        comments: row.comments || 0,
        timestamp: row.timestamp,
      }));
    });
  }

  // 搜索功能
  async search(keyword: string, timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_SEARCH, keyword, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSearchResults(keyword, timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  private async fetchSearchResults(keyword: string, timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 搜索匹配的帖子
      const posts = await manager.query(`
        SELECT
          post.id,
          post.text as content,
          nlp.sentiment->>'overall' as sentiment,
          nlp.sentiment->>'confidence' as confidence,
          post.user->>'screen_name' as author,
          post.ingested_at as timestamp
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        WHERE (post.text ILIKE $1 OR post.text_raw ILIKE $1)
          AND post.ingested_at >= $2
          AND post.ingested_at <= $3
          AND post.deleted_at IS NULL
        ORDER BY post.ingested_at DESC
        LIMIT 50
      `, [`%${keyword}%`, start, end]);

      // 统计情感分布
      const stats = await manager.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
        FROM post_nlp_results nlp
        INNER JOIN weibo_posts post ON post.id = nlp.post_id
        WHERE (post.text ILIKE $1 OR post.text_raw ILIKE $1)
          AND post.ingested_at >= $2
          AND post.ingested_at <= $3
          AND post.deleted_at IS NULL
      `, [`%${keyword}%`, start, end]);

      const total = parseInt(stats[0]?.total || '0');

      return {
        keyword,
        totalResults: total,
        sentimentDistribution: {
          positive: total > 0 ? Math.round((parseInt(stats[0]?.positive || '0') / total) * 100) : 0,
          negative: total > 0 ? Math.round((parseInt(stats[0]?.negative || '0') / total) * 100) : 0,
          neutral: total > 0 ? Math.round((parseInt(stats[0]?.neutral || '0') / total) * 100) : 0,
        },
        posts: posts.map((row: any) => ({
          id: row.id,
          content: row.content,
          sentiment: row.sentiment,
          confidence: parseFloat(row.confidence || '0'),
          author: row.author || '未知用户',
          timestamp: row.timestamp,
        })),
      };
    });
  }

  // 辅助方法：根据时间范围选择时间粒度
  private getTimeGranularity(timeRange: TimeRange): string {
    // 解析时间范围
    const match = timeRange.match(/^(\d+)([hd])$/);
    if (!match) return 'hour';

    const value = parseInt(match[1]!, 10);
    const unit = match[2];

    if (unit === 'h') {
      // 小时级别：按小时或分钟
      return value <= 6 ? 'hour' : 'hour';
    } else {
      // 天级别
      if (value <= 7) return 'hour';      // 7天内按小时
      if (value <= 30) return 'day';      // 30天内按天
      if (value <= 90) return 'day';      // 90天内按天
      return 'week';                       // 更长时间按周
    }
  }
}
