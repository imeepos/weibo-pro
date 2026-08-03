import { Injectable, Inject, Logger, } from '@sker/core';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import type { TimeRange } from './types';
import { fetchAgeDistribution } from './charts/age-distribution.query';
import { fetchGenderDistribution } from './charts/gender-distribution.query';
import { fetchSentimentTrend } from './charts/sentiment-trend.query';
import { fetchGeographic } from './charts/geographic.query';
import { fetchEventTypes } from './charts/event-types.query';
import { fetchWordCloud } from './charts/word-cloud.query';
import { fetchEventCountSeries } from './charts/event-count-series.query';
import { fetchPostCountSeries } from './charts/post-count-series.query';
import { fetchSentimentData } from './charts/sentiment-data.query';
import type { ChartData } from './charts/types';

export type { ChartData };

@Injectable({ providedIn: 'root' })
export class ChartsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(Logger, {optional: true})
    private readonly logger: Logger
  ) {}

  async getAgeDistribution(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_AGE, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchAgeDistribution(timeRange),
      CACHE_TTL.LONG
    );
  }

  async getGenderDistribution(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_GENDER, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchGenderDistribution(timeRange),
      CACHE_TTL.LONG
    );
  }

  async getSentimentTrend(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_SENTIMENT_TREND, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchSentimentTrend(timeRange, this.logger),
      CACHE_TTL.MEDIUM
    );
  }

  async getGeographic(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_GEOGRAPHIC, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchGeographic(timeRange),
      CACHE_TTL.LONG
    );
  }

  async getEventTypes(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_EVENT_TYPES, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchEventTypes(timeRange, this.logger),
      CACHE_TTL.MEDIUM
    );
  }

  async getWordCloud(timeRange: TimeRange = '12h', limit: number = 50, sentiment?: 'positive' | 'negative' | 'neutral') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_WORDCLOUD, timeRange, limit, sentiment || 'all');
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchWordCloud(timeRange, limit, sentiment),
      CACHE_TTL.MEDIUM
    );
  }

  async getEventCountSeries(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_EVENT_COUNT, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchEventCountSeries(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  async getPostCountSeries(timeRange: TimeRange = '12h'): Promise<ChartData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_POST_COUNT, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchPostCountSeries(timeRange),
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentData(timeRange: TimeRange = '12h') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.CHART_SENTIMENT_DATA, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchSentimentData(timeRange),
      CACHE_TTL.MEDIUM
    );
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
}
