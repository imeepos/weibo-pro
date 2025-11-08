/**
 * 图表数据API服务
 * 统一管理所有图表数据的获取
 */

import { apiClient } from './apiClient';
import { withErrorBoundary } from '@/utils/errorHandler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ChartsAPI');
import type {
  AgeDistributionData,
  GenderDistributionData,
  SentimentTrendData,
  GeographicData,
  EventTypeData,
  HotTopicData,
  TimeSeriesDataPoint,
} from '../../types/charts';

// 图表数据API类
export class ChartsAPI {
  // 获取年龄分布数据
  static getAgeDistribution = withErrorBoundary(
    async (timeRange?: string): Promise<AgeDistributionData[]> => {
      logger.debug('Fetching age distribution data');
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<AgeDistributionData[]>(
        `/api/charts/age-distribution${params}`,
        {
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getAgeDistribution' }
  );

  // 获取性别分布数据
  static getGenderDistribution = withErrorBoundary(
    async (timeRange?: string): Promise<GenderDistributionData[]> => {
      logger.debug('Fetching gender distribution data');
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<GenderDistributionData[]>(
        `/api/charts/gender-distribution${params}`,
        {
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getGenderDistribution' }
  );

  // 获取情感趋势数据
  static getSentimentTrend = withErrorBoundary(
    async (hours: number = 24): Promise<SentimentTrendData[]> => {
      logger.debug('Fetching sentiment trend data', { hours });

      // 后端返回 ChartData 格式，需要转换为 SentimentTrendData[]
      const response = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>(
        '/api/charts/sentiment-trend',
        {
          params: { hours },
          retry: { count: 3, delay: 1000 },
          timeout: 10000,
        }
      );

      const chartData = response.data;

      console.log({ chartData })

      // 数据转换：ChartData → SentimentTrendData[]
      if (!chartData?.categories || !chartData?.series) {
        return [];
      }

      const positiveIndex = chartData.series.findIndex(s => s.name === '正面');
      const negativeIndex = chartData.series.findIndex(s => s.name === '负面');
      const neutralIndex = chartData.series.findIndex(s => s.name === '中性');

      return chartData.categories.map((timestamp, index) => ({
        timestamp,
        positive: positiveIndex >= 0 ? chartData.series[positiveIndex]?.data[index] || 0 : 0,
        negative: negativeIndex >= 0 ? chartData.series[negativeIndex]?.data[index] || 0 : 0,
        neutral: neutralIndex >= 0 ? chartData.series[neutralIndex]?.data[index] || 0 : 0,
        total: (positiveIndex >= 0 ? chartData.series[positiveIndex]?.data[index] || 0 : 0) +
          (negativeIndex >= 0 ? chartData.series[negativeIndex]?.data[index] || 0 : 0) +
          (neutralIndex >= 0 ? chartData.series[neutralIndex]?.data[index] || 0 : 0),
      }));
    },
    { component: 'ChartsAPI', action: 'getSentimentTrend' }
  );

  // 获取地理分布数据
  static getGeographicData = withErrorBoundary(
    async (timeRange?: string): Promise<GeographicData[]> => {
      logger.debug('Fetching geographic data');
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<GeographicData[]>(
        `/api/charts/geographic${params}`,
        {
          retry: { count: 2, delay: 1000 },
          timeout: 12000, // 地理数据可能较大，给更长超时时间
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getGeographicData' }
  );

  // 获取事件类型分布数据
  static getEventTypes = withErrorBoundary(
    async (timeRange?: string): Promise<EventTypeData[]> => {
      logger.debug('Fetching event types data');
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<EventTypeData[]>(
        `/api/charts/event-types${params}`,
        {
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getEventTypes' }
  );

  // 获取词云数据
  static getWordCloudData = withErrorBoundary(
    async (count: number = 50, timeRange?: string): Promise<HotTopicData[]> => {
      logger.debug('Fetching word cloud data', { count, timeRange });
      const response = await apiClient.get<HotTopicData[]>(
        '/api/charts/word-cloud',
        {
          params: { count, timeRange },
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getWordCloudData' }
  );

  // 获取事件计数时间序列
  static getEventCountSeries = withErrorBoundary(
    async (days: number = 7): Promise<TimeSeriesDataPoint[]> => {
      logger.debug('Fetching event count series', { days });
      const response = await apiClient.get<TimeSeriesDataPoint[]>(
        '/api/charts/event-count-series',
        {
          params: { days },
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getEventCountSeries' }
  );

  // 获取帖子计数时间序列
  static getPostCountSeries = withErrorBoundary(
    async (days: number = 7): Promise<TimeSeriesDataPoint[]> => {
      logger.debug('Fetching post count series', { days });
      const response = await apiClient.get<TimeSeriesDataPoint[]>(
        '/api/charts/post-count-series',
        {
          params: { days },
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getPostCountSeries' }
  );

  // 获取简单情感分析数据
  static getSentimentData = withErrorBoundary(
    async (timeRange?: string): Promise<{ positive: number; negative: number; neutral: number; total: number }> => {
      logger.debug('Fetching sentiment data');
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<{ positive: number; negative: number; neutral: number; total: number }>(
        `/api/charts/sentiment-data${params}`,
        {
          retry: { count: 2, delay: 1000 },
          timeout: 8000,
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getSentimentData' }
  );

  // 批量获取图表数据
  static getBatchChartData = withErrorBoundary(
    async (chartTypes: string[]): Promise<Record<string, unknown>> => {
      logger.debug('Fetching batch chart data', { chartTypes });
      const response = await apiClient.get<Record<string, unknown>>(
        '/api/charts/batch',
        {
          params: { types: chartTypes.join(',') },
          retry: { count: 1, delay: 1000 },
          timeout: 15000, // 批量数据需要更长时间
        }
      );
      return response.data;
    },
    { component: 'ChartsAPI', action: 'getBatchChartData' }
  );

  // ================== 兼容性方法 ==================

  // Legacy methods for backward compatibility
  static async getOverviewStats() {
    return this.getSentimentData();
  }

  static async getEmotionCurve(points: number = 7) {
    return this.getSentimentTrend(points);
  }

  static async getEventCount(range?: string) {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 7;
    return this.getEventCountSeries(days);
  }

  static async getHotEvents(limit: number = 10, timeRange?: string) {
    return this.getWordCloudData(limit, timeRange);
  }

  static async getPostCount(range?: string) {
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 7;
    return this.getPostCountSeries(days);
  }

  static async getEventTypeDistribution() {
    return this.getEventTypes();
  }

  static async getWordCloud(limit: number = 100, timeRange?: string) {
    return this.getWordCloudData(limit, timeRange);
  }

  static async getHeatmapData() {
    // 返回地理数据的热力图格式
    const geoData = await this.getGeographicData();
    return geoData.map((item, x) => [x, 0, item.value || 0]);
  }
}

// 导出便捷方法
export const {
  getAgeDistribution,
  getGenderDistribution,
  getSentimentTrend,
  getGeographicData,
  getEventTypes,
  getWordCloudData,
  getEventCountSeries,
  getPostCountSeries,
  getSentimentData,
  getBatchChartData,
} = ChartsAPI;