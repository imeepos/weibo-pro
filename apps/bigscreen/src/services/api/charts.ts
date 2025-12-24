/**
 * 图表数据API服务
 * 统一管理所有图表数据的获取
 */

import { withErrorBoundary } from '@/utils/errorHandler';
import { createLogger } from '@sker/core';
import { root } from '@sker/core'
import { ChartsController, type TimeRange } from '@sker/sdk'
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
    async (timeRange?: TimeRange): Promise<AgeDistributionData[]> => {
      logger.debug('Fetching age distribution data');
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getAgeDistribution(timeRange);
      return (data as any).series?.[0]?.data?.map((value: number, index: number) => ({
        age: (data as any).categories?.[index] || '',
        value,
        percentage: 0
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getAgeDistribution' }
  );

  // 获取性别分布数据
  static getGenderDistribution = withErrorBoundary(
    async (timeRange?: TimeRange): Promise<GenderDistributionData[]> => {
      logger.debug('Fetching gender distribution data');
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getGenderDistribution(timeRange);
      return (data as any).series?.map((s: any) => ({
        name: s.name,
        value: s.data?.[0] || 0,
        percentage: 0,
        color: ''
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getGenderDistribution' }
  );

  // 获取情感趋势数据
  static getSentimentTrend = withErrorBoundary(
    async (hours: number = 24): Promise<SentimentTrendData[]> => {
      // 将 hours 转换为 TimeRange（保持前端 API 兼容性）
      const timeRange: TimeRange = hours <= 1 ? '1h' :
                                     hours <= 6 ? '6h' :
                                     hours <= 12 ? '12h' :
                                     hours <= 24 ? '24h' :
                                     hours <= 168 ? '7d' : '30d';

      const chartsController = root.get(ChartsController);
      const chartData = await chartsController.getSentimentTrend(timeRange) as any;

      // 数据转换：ChartData → SentimentTrendData[]
      if (!chartData?.categories || !chartData?.series) {
        return [];
      }

      const positiveIndex = chartData.series.findIndex((s: any) => s.name === '正面');
      const negativeIndex = chartData.series.findIndex((s: any) => s.name === '负面');
      const neutralIndex = chartData.series.findIndex((s: any) => s.name === '中性');

      return chartData.categories.map((timestamp: string, index: number) => ({
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
    async (timeRange?: TimeRange): Promise<GeographicData[]> => {
      logger.debug('Fetching geographic data');
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getGeographic(timeRange);
      return (data as any).series?.map((s: any, index: number) => ({
        name: (data as any).categories?.[index] || s.name,
        value: s.data?.[0] || 0
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getGeographicData' }
  );

  // 获取事件类型分布数据
  static getEventTypes = withErrorBoundary(
    async (timeRange?: TimeRange): Promise<EventTypeData[]> => {
      logger.debug('Fetching event types data');
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getEventTypes(timeRange);
      return (data as any).series?.map((s: any, index: number) => ({
        type: (data as any).categories?.[index] || s.name,
        count: s.data?.[0] || 0,
        percentage: 0
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getEventTypes' }
  );

  // 获取词云数据
  static getWordCloudData = withErrorBoundary(
    async (count: number = 50, timeRange?: TimeRange): Promise<HotTopicData[]> => {
      logger.debug('Fetching word cloud data', { count, timeRange });
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getWordCloud(timeRange, count);
      return data as HotTopicData[];
    },
    { component: 'ChartsAPI', action: 'getWordCloudData' }
  );

  // 获取事件计数时间序列
  static getEventCountSeries = withErrorBoundary(
    async (days: number = 7): Promise<TimeSeriesDataPoint[]> => {
      logger.debug('Fetching event count series', { days });
      // 将 days 转换为 TimeRange（保持前端 API 兼容性）
      const timeRange: TimeRange = days <= 1 ? '24h' :
                                     days <= 7 ? '7d' :
                                     days <= 30 ? '30d' :
                                     days <= 90 ? '90d' :
                                     days <= 180 ? '180d' : '365d';
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getEventCountSeries(timeRange);
      return (data as any).categories?.map((timestamp: string, index: number) => ({
        timestamp,
        value: (data as any).series?.[0]?.data?.[index] || 0
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getEventCountSeries' }
  );

  // 获取帖子计数时间序列
  static getPostCountSeries = withErrorBoundary(
    async (days: number = 7): Promise<TimeSeriesDataPoint[]> => {
      logger.debug('Fetching post count series', { days });
      // 将 days 转换为 TimeRange（保持前端 API 兼容性）
      const timeRange: TimeRange = days <= 1 ? '24h' :
                                     days <= 7 ? '7d' :
                                     days <= 30 ? '30d' :
                                     days <= 90 ? '90d' :
                                     days <= 180 ? '180d' : '365d';
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getPostCountSeries(timeRange);
      return (data as any).categories?.map((timestamp: string, index: number) => ({
        timestamp,
        value: (data as any).series?.[0]?.data?.[index] || 0
      })) || [];
    },
    { component: 'ChartsAPI', action: 'getPostCountSeries' }
  );

  // 获取简单情感分析数据
  static getSentimentData = withErrorBoundary(
    async (timeRange?: TimeRange): Promise<{ positive: number; negative: number; neutral: number; total: number }> => {
      logger.debug('Fetching sentiment data');
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getSentimentData(timeRange);
      return data as { positive: number; negative: number; neutral: number; total: number };
    },
    { component: 'ChartsAPI', action: 'getSentimentData' }
  );

  // 批量获取图表数据
  static getBatchChartData = withErrorBoundary(
    async (chartTypes: string[], timeRange?: TimeRange): Promise<Record<string, unknown>> => {
      logger.debug('Fetching batch chart data', { chartTypes, timeRange });
      // 注意：SDK 的 getBatchCharts 不支持 chartTypes 筛选，返回所有图表数据
      const chartsController = root.get(ChartsController);
      const data = await chartsController.getBatchCharts(timeRange);
      return data as Record<string, unknown>;
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

  static async getHotEvents(limit: number = 10, timeRange?: TimeRange) {
    return this.getWordCloudData(limit, timeRange);
  }

  static async getPostCount(range?: string) {
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 7;
    return this.getPostCountSeries(days);
  }

  static async getEventTypeDistribution() {
    return this.getEventTypes();
  }

  static async getWordCloud(limit: number = 100, timeRange?: TimeRange) {
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