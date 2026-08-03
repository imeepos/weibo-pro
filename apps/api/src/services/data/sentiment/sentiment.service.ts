/**
 * 情感分析服务
 */

import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import {
  getTimeRangeBoundaries,
  getPreviousTimeRangeBoundaries,
} from '../time-range.utils';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type { TimeRange } from '../types';
import type { SentimentStatistics, SentimentRealTimeData } from './sentiment.types';
import {
  fetchSentimentCounts,
  fetchSentimentStatistics,
  fetchKeywords,
  fetchHotTopics,
  fetchTimeSeries,
  fetchLocations,
  fetchRecentPosts,
  fetchSearchResults,
  fetchPolarizationCounts,
} from './sentiment.queries';
import { calculateTrend } from './sentiment.utils';

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
      const currentCounts = await fetchSentimentCounts(manager, current.start, current.end);

      // 上一时段数据（用于趋势计算）
      const previousCounts = await fetchSentimentCounts(manager, previous.start, previous.end);

      return {
        timestamp: new Date().toISOString(),
        positive: currentCounts.positive,
        negative: currentCounts.negative,
        neutral: currentCounts.neutral,
        total: currentCounts.total,
        trend: {
          positive: calculateTrend(currentCounts.positive, previousCounts.positive),
          negative: calculateTrend(currentCounts.negative, previousCounts.negative),
          neutral: calculateTrend(currentCounts.neutral, previousCounts.neutral),
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
      const result = await fetchSentimentStatistics(manager, start, end);

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
      return fetchKeywords(manager, start, end, limit);
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
      return fetchHotTopics(manager, start, end, limit);
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
      return fetchTimeSeries(manager, timeRange, start, end);
    });
  }

  // 获取地理位置分布
  async getLocations(timeRange: TimeRange = '12h') {
    const _cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_LOCATIONS, timeRange);

    return await this.fetchLocations(timeRange)
  }

  private async fetchLocations(timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);
      return fetchLocations(manager, start, end);
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
      return fetchRecentPosts(manager, start, end, limit);
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
      return fetchSearchResults(manager, keyword, start, end);
    });
  }

  // 获取情感极化指数
  async getPolarization(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_POLARIZATION, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchPolarization(timeRange),
      CACHE_TTL.MEDIUM // 统计数据: 5分钟缓存
    );
  }

  private async fetchPolarization(timeRange: TimeRange) {
    // 导入计算工具函数
    const { calculateSentimentPolarization, getPolarizationLevel, getPolarizationColor } = await import('../../../utils/sentiment-polarization.utils');

    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      // 查询情感分布
      const result = await fetchPolarizationCounts(manager, start, end);

      const row = result[0];
      const positive = parseInt(row?.positive || '0');
      const negative = parseInt(row?.negative || '0');
      const neutral = parseInt(row?.neutral || '0');

      // 计算极化指数
      const polarizationResult = calculateSentimentPolarization(positive, negative, neutral);

      // 添加等级和颜色信息
      return {
        ...polarizationResult,
        polarizationLevel: getPolarizationLevel(polarizationResult.polarizationIndex),
        polarizationColor: getPolarizationColor(polarizationResult.polarizationIndex),
      };
    });
  }
}
