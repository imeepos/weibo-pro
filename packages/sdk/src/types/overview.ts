/**
 * 概览相关类型
 */
import type { ChartData, TimeRange } from './base'
import type { HotEvent, WordCloudItem } from './event'
import type { UserRelationNetwork } from './user-relation'

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

export interface OverviewRealtimeSnapshot {
  timeRange: TimeRange
  generatedAt: string
  cacheTtlSeconds: number
  statistics: OverviewStatisticsData
  sentiment: OverviewSentiment
  locations: OverviewLocation[]
  hotEvents: HotEvent[]
  wordCloud: WordCloudItem[]
  emotionCurve: ChartData
  eventTypes: ChartData
  userRelationNetwork: UserRelationNetwork
}

export interface OverviewRealtimeSnapshotRefreshResult {
  success: boolean
  clearedPatterns: string[]
}
