/**
 * 概览相关类型
 */

export interface OverviewStatisticsData {
  eventCount: number
  eventCountChange: number
  postCount: number
  postCountChange: number
  userCount: number
  userCountChange: number
  interactionCount: number
  interactionCountChange: number
}

export interface OverviewSentiment {
  positive: number
  negative: number
  neutral: number
  total: number
  positivePercentage: number
  negativePercentage: number
  neutralPercentage: number
  trend: 'rising' | 'stable' | 'falling'
  avgScore: number
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
