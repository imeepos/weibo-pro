/**
 * 概览页面API服务
 */

import { root } from '@sker/core';
import { OverviewController, type OverviewRealtimeSnapshot, type TimeRange } from '@sker/sdk';
import type { OverviewStatisticsData } from '../../types';

// 使用统一的 OverviewStatisticsData 类型
export type OverviewStatistics = OverviewStatisticsData;

// 情感数据类型
export interface OverviewSentiment {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  trend: 'rising' | 'stable' | 'falling';
  avgScore: number;
}

// 使用统一的 LocationData 类型
export interface OverviewLocation {
  region: string;
  province?: string;
  city?: string;
  count: number;
  percentage: number;
  coordinates?: [number, number];
  trend: 'up' | 'down' | 'stable';
}

export const OverviewAPI = {
  // 获取统计数据
  getStatistics: async (timeRange?: TimeRange): Promise<OverviewStatistics> => {
    const overviewController = root.get(OverviewController);
    return await overviewController.getStatistics(timeRange) as OverviewStatistics;
  },

  // 获取情感数据
  getSentiment: async (timeRange?: TimeRange): Promise<OverviewSentiment> => {
    const overviewController = root.get(OverviewController);
    return await overviewController.getSentiment(timeRange) as OverviewSentiment;
  },

  // 获取地理位置数据
  getLocations: async (timeRange?: TimeRange): Promise<OverviewLocation[]> => {
    const overviewController = root.get(OverviewController);
    return await overviewController.getLocations(timeRange) as OverviewLocation[];
  },

  getRealtimeSnapshot: async (timeRange?: TimeRange): Promise<OverviewRealtimeSnapshot> => {
    const overviewController = root.get(OverviewController);
    return await overviewController.getRealtimeSnapshot(timeRange);
  },

  refreshRealtimeSnapshotCache: async (timeRange?: TimeRange) => {
    const overviewController = root.get(OverviewController);
    return await overviewController.refreshRealtimeSnapshotCache(timeRange);
  },
};
