/**
 * 通用API服务
 * 统一使用 @sker/sdk 的依赖注入方式
 */

import { root } from '@sker/core'
import { ChartsController, type TimeRange } from '@sker/sdk'

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

// 将 days 转换为 TimeRange
const daysToTimeRange = (days: number): TimeRange => {
  if (days <= 1) return '24h'
  if (days <= 7) return '7d'
  if (days <= 30) return '30d'
  if (days <= 90) return '90d'
  if (days <= 180) return '180d'
  return '365d'
}

// 通用API类
export class CommonAPI {
  // 获取日期序列数据
  static async getDateSeries(days: number = 7): Promise<DateSeriesData[]> {
    try {
      const chartsController = root.get(ChartsController)
      const timeRange = daysToTimeRange(days)

      const chartData = await chartsController.getEventCountSeries(timeRange) as any

      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((date: string, index: number) => ({
          date,
          count: chartData.series[0].data[index] || 0
        }))
      }
      return []
    } catch (error) {
      console.error('获取日期序列数据失败:', error)
      return []
    }
  }

  // 获取情感曲线数据
  static async getEmotionCurve(timeRangeOrPoints?: string | number): Promise<EmotionCurveData> {
    try {
      const chartsController = root.get(ChartsController)

      // 兼容旧的 points 参数和新的 timeRange 参数
      let timeRange: TimeRange
      if (typeof timeRangeOrPoints === 'string') {
        timeRange = timeRangeOrPoints as TimeRange
      } else {
        const points = timeRangeOrPoints || 7
        timeRange = daysToTimeRange(points)
      }

      const chartData = await chartsController.getSentimentTrend(timeRange) as any

      // 将后端的 ChartData 格式转换为前端期望的 EmotionCurveData 格式
      const positiveIndex = chartData.series?.findIndex((s: any) => s.name === '正面') ?? -1
      const negativeIndex = chartData.series?.findIndex((s: any) => s.name === '负面') ?? -1
      const neutralIndex = chartData.series?.findIndex((s: any) => s.name === '中性') ?? -1

      return {
        hours: chartData.categories || [],
        positiveData: positiveIndex >= 0 ? chartData.series[positiveIndex].data : [],
        negativeData: negativeIndex >= 0 ? chartData.series[negativeIndex].data : [],
        neutralData: neutralIndex >= 0 ? chartData.series[neutralIndex].data : []
      }
    } catch (error) {
      console.error('[CommonAPI.getEmotionCurve] ❌ 获取情感曲线数据失败:', error)
      return {
        hours: [],
        positiveData: [],
        negativeData: [],
        neutralData: []
      }
    }
  }

  // 获取情感饼图数据
  static async getSentimentPie(timeRange?: string): Promise<SentimentPieData[]> {
    try {
      const chartsController = root.get(ChartsController)
      const sentimentData = await chartsController.getSentimentData(timeRange as TimeRange)

      return [
        { name: '正面', value: sentimentData.positive, color: '#10b981' },
        { name: '负面', value: sentimentData.negative, color: '#ef4444' },
        { name: '中性', value: sentimentData.neutral, color: '#6b7280' }
      ]
    } catch (error) {
      console.error('获取情感饼图数据失败:', error)
      return []
    }
  }

  // 获取事件类型统计
  static async getEventTypes(timeRange?: string): Promise<EventTypeData[]> {
    try {
      const chartsController = root.get(ChartsController)
      const chartData = await chartsController.getEventTypes(timeRange as TimeRange) as any

      // 格式转换：ChartData → EventTypeData[]
      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((name: string, index: number) => ({
          name,
          value: chartData.series[0].data[index] || 0,
          color: '#6b7280' // 默认颜色
        }))
      }
      return []
    } catch (error) {
      console.error('获取事件类型数据失败:', error)
      return []
    }
  }

  // 获取帖子数量历史数据
  static async getPostCountHistory(days: number = 7): Promise<PostCountHistoryData[]> {
    try {
      const chartsController = root.get(ChartsController)
      const timeRange = daysToTimeRange(days)

      const chartData = await chartsController.getPostCountSeries(timeRange) as any

      if (chartData?.categories && chartData.series?.[0]?.data) {
        return chartData.categories.map((date: string, index: number) => ({
          date,
          count: chartData.series[0].data[index] || 0
        }))
      }
      return []
    } catch (error) {
      console.error('获取帖子数量历史数据失败:', error)
      return []
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
} = CommonAPI