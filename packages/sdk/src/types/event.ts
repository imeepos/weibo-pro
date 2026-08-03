/**
 * 舆情事件核心分析类型
 */
import type { ChartData, SentimentScore } from './base'

export interface AgeDistributionData extends ChartData { }

export interface GenderDistributionData extends ChartData { }

export interface SentimentTrendData extends ChartData { }

export interface GeographicData extends ChartData { }

export interface EventTypeData extends ChartData { }

export interface WordCloudItem {
  keyword: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
  weight: number
}

export interface TimeSeriesData extends ChartData { }

export interface EventListItem {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: SentimentScore;
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
  trendData: number[];
}

export interface EventCategoryData {
  category: string
  count: number
  percentage: number
}

export interface EventCategoryStats {
  categories: string[]
  counts: number[]
}

export interface TrendData {
  timestamp: string
  eventCount: number
  postCount: number
  userCount: number
}

export interface TrendDataSeries {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
  totals: {
    totalEvents: number
    totalPosts: number
    totalUsers: number
    avgHotness: number
  }
}

export interface TrendAnalysis {
  timeline: string[]
  postVolume: number[]
  sentimentScores: number[]
  userEngagement: number[]
  hotnessData: number[]
  totalPosts?: number
}

export interface HotListItem {
  id: string
  title: string
  heat: number
  posts: number
  users: number
  sentiment: 'positive' | 'negative' | 'neutral'
  trend: 'rising' | 'stable' | 'falling'
}
export interface HotEvent {
  id: string
  title: string
  heat: number
  posts: number
  users: number
  sentiment: 'positive' | 'negative' | 'neutral'
  trend: 'rising' | 'stable' | 'falling'
}

export interface GeographicDistribution {
  region: string
  count: number
  percentage: number
  posts: number
  sentiment: number
}

// 地理分布统计数据
export interface GeographicStatistics {
  regionCount: number      // 地区总数
  userCount: number        // 发帖用户数
  postCount: number        // 帖子总数
  avgSentiment: number     // 平均情感 (0-1)
}

// 地理分布响应（包含统计数据和分布列表）
export interface GeographicResponse {
  statistics: GeographicStatistics
  distributions: GeographicDistribution[]
}

export interface EventTimelineNode {
  time: string;
  event: string;
  type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone';
  impact: number;
  description: string;
  metrics: {
    posts: number;
    users: number;
    sentiment: number;
  };
}

export interface EventPropagationPath {
  userType: string;
  userCount: number;
  postCount: number;
  influence: number;
}

export interface EventKeyNode {
  time: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metrics: {
    posts: number;
    users: number;
    sentiment: number;
  };
}

export interface EventDevelopmentPhase {
  phase: string;
  timeRange: string;
  description: string;
  keyEvents: string[];
  keyTasks: string[];
  keyMeasures: string[];
  metrics: {
    hotness: number;
    posts: number;
    users: number;
    sentiment: number;
  };
  status: 'completed' | 'ongoing' | 'planned';
}

export interface EventDevelopmentPattern {
  outbreakSpeed: string;
  propagationScope: string;
  duration: string;
  impactDepth: string;
}

export interface EventSuccessFactor {
  title: string;
  description: string;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: SentimentScore;
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  timeline: EventTimelineNode[];
  propagationPath: EventPropagationPath[];
  keyNodes: EventKeyNode[];
}

export interface InfluenceUser {
  userId: string;
  username: string;
  influence: number;
  postCount: number;
  followers: number;
  interactionCount: number;
  sentimentScore: number;
}
