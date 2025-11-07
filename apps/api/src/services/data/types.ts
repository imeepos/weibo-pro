// 与前端类型保持一致的数据类型定义

export interface OverviewStatisticsData {
  eventCount: number;
  eventCountChange: number;
  postCount: number;
  postCountChange: number;
  userCount: number;
  userCountChange: number;
  interactionCount: number;
  interactionCountChange: number;
}

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

export interface OverviewLocation {
  region: string;
  province?: string;
  city?: string;
  count: number;
  percentage: number;
  coordinates?: [number, number];
  trend: 'up' | 'down' | 'stable';
}

export interface KeywordData {
  keyword: string;
  weight: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// 从 entities 导出类型，避免重复定义
export type { HotEvent, TimeRange } from '@sker/entities';