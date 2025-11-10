/**
 * 通用API服务
 */

import { apiUtils as apiClient } from './client';

// 日期序列数据类型
export interface DateSeriesData {
  date: string;
  count: number;
}

// 情感曲线数据类型
export interface EmotionCurveData {
  hours: string[];
  positiveData: number[];
  negativeData: number[];
  neutralData: number[];
}

// 情感饼图数据类型
export interface SentimentPieData {
  name: string;
  value: number;
  color: string;
}

// 事件类型数据类型
export interface EventTypeData {
  name: string;
  value: number;
  color: string;
}

// 帖子数量历史数据类型
export interface PostCountHistoryData {
  date: string;
  count: number;
}

// 通用API类
export class CommonAPI {
  // 获取日期序列数据
  static async getDateSeries(days: number = 7): Promise<DateSeriesData[]> {
    try {
      // 调用 charts 接口的 event-count-series
      const chartData = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>('/charts/event-count-series', {
        params: { timeRange: days > 7 ? 'month' : 'week' }
      });

      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((date, index) => ({
          date,
          count: chartData.series[0].data[index] || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('获取日期序列数据失败:', error);
      return [];
    }
  }

  // 获取情感曲线数据
  static async getEmotionCurve(timeRangeOrPoints?: string | number): Promise<EmotionCurveData> {
    try {
      // 兼容旧的 points 参数和新的 timeRange 参数
      let timeRange: string;
      if (typeof timeRangeOrPoints === 'string') {
        timeRange = timeRangeOrPoints;
      } else {
        const points = timeRangeOrPoints || 7;
        timeRange = points > 7 ? 'month' : 'week';
      }

      console.log('[CommonAPI.getEmotionCurve] 🚀 开始请求', {
        原始参数: timeRangeOrPoints,
        最终timeRange: timeRange
      });

      // 调用 charts 接口的 sentiment-trend，该接口提供相同的功能
      const chartData = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>(
        '/charts/sentiment-trend',
        {
          params: {
            timeRange: timeRange
          }
        }
      );

      console.log('[CommonAPI.getEmotionCurve] 📦 收到原始数据', JSON.stringify(chartData, null, 2));

      // 将后端的 ChartData 格式转换为前端期望的 EmotionCurveData 格式
      const positiveIndex = chartData.series?.findIndex(s => s.name === '正面') ?? -1;
      const negativeIndex = chartData.series?.findIndex(s => s.name === '负面') ?? -1;
      const neutralIndex = chartData.series?.findIndex(s => s.name === '中性') ?? -1;

      console.log('[CommonAPI.getEmotionCurve] 🔍 索引查找', { positiveIndex, negativeIndex, neutralIndex });

      const result = {
        hours: chartData.categories || [],
        positiveData: positiveIndex >= 0 ? chartData.series[positiveIndex].data : [],
        negativeData: negativeIndex >= 0 ? chartData.series[negativeIndex].data : [],
        neutralData: neutralIndex >= 0 ? chartData.series[neutralIndex].data : []
      };

      console.log('[CommonAPI.getEmotionCurve] ✅ 转换后数据', JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error('[CommonAPI.getEmotionCurve] ❌ 获取情感曲线数据失败:', error);
      // 返回默认空数据
      return {
        hours: [],
        positiveData: [],
        negativeData: [],
        neutralData: []
      };
    }
  }

  // 获取情感饼图数据
  static async getSentimentPie(timeRange?: string): Promise<SentimentPieData[]> {
    try {
      // 调用 sentiment 接口获取情感统计数据
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const sentimentData = await apiClient.get<{
        positive: number;
        negative: number;
        neutral: number;
        total: number;
      }>(`/charts/sentiment-data${params}`);

      return [
        { name: '正面', value: sentimentData.positive, color: '#10b981' },
        { name: '负面', value: sentimentData.negative, color: '#ef4444' },
        { name: '中性', value: sentimentData.neutral, color: '#6b7280' }
      ];
    } catch (error) {
      console.error('获取情感饼图数据失败:', error);
      return [];
    }
  }

  // 获取事件类型统计
  static async getEventTypes(timeRange?: string): Promise<EventTypeData[]> {
    try {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const chartData = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>(`/charts/event-types${params}`);

      // 格式转换：ChartData → EventTypeData[]
      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((name, index) => ({
          name,
          value: chartData.series[0].data[index] || 0,
          color: '#6b7280' // 默认颜色
        }));
      }
      return [];
    } catch (error) {
      console.error('获取事件类型数据失败:', error);
      return [];
    }
  }

  // 获取帖子数量历史数据
  static async getPostCountHistory(days: number = 7): Promise<PostCountHistoryData[]> {
    try {
      // 调用 charts 接口的 post-count-series
      const chartData = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>('/charts/post-count-series', {
        params: { timeRange: days > 7 ? 'month' : 'week' }
      });

      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((date, index) => ({
          date,
          count: chartData.series[0].data[index] || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('获取帖子数量历史数据失败:', error);
      return [];
    }
  }
}

// 导出便捷方法
export const {
  getDateSeries,
  getEmotionCurve,
  getSentimentPie,
  getEventTypes,
  getPostCountHistory,
} = CommonAPI;