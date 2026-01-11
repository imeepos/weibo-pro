import type {
  EventEntity,
  TimeRange,
  HotEvent,
} from '@sker/entities';

export type { HotEvent, TimeRange };

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

export interface EventWithCategory extends Omit<EventEntity, 'category'> {
  category?: { name: string } | null;
}

export interface EventStatistics {
  event_id: string;
  post_count: number;
  user_count: number;
  sentiment: SentimentScore;
  hotness: number;
  snapshot_at: Date;
}

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
  createdAt: string;
  lastUpdate: string;
  trendData: number[];
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

export interface GeographicDistribution {
  region: string;
  count: number;
  percentage: number;
  posts: number;
  sentiment: number;
}

export interface TrendDataSeries {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  totals: {
    totalEvents: number;
    totalPosts: number;
    totalUsers: number;
    avgHotness: number;
  };
}

export interface EventCategoryStats {
  categories: string[];
  counts: number[];
}

export interface TimeSeriesData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export interface TrendAnalysis {
  timeline: string[];
  postVolume: number[];
  sentimentScores: number[];
  userEngagement: number[];
  hotnessData: number[];
}

// 新增：NLP 深度分析类型
export interface EventSentimentHotness {
  postId: string
  sentimentScore: number
  hotness: number
  timestamp: string
}

export interface EventSentimentDistribution {
  positive: { count: number; percentage: number }
  negative: { count: number; percentage: number }
  neutral: { count: number; percentage: number }
}

export interface EventSentimentIntensity {
  intensity: number
  count: number
}

export interface EventKeywordTimeSeries {
  keyword: string
  timeData: Array<{
    timestamp: string
    weight: number
  }>
}

export interface EventKeywordBySentiment {
  keyword: string
  weight: number
  sentiment: 'positive' | 'negative' | 'neutral'
  count: number
}

export interface EventNegativeKeywordAlert {
  keyword: string
  weight: number
  count: number
  trend: 'rising' | 'stable' | 'falling'
}

export interface EventEventTypeDistribution {
  eventType: string
  count: number
  confidence: number
  avgSentiment: number
}

// 新增：基于 EventHourlyStatisticsEntity 的互动指标类型
export interface EventEngagementTrend {
  timestamp: string
  post_count: number
  comment_count: number
  repost_count: number
  like_count: number
  user_count: number
  hotness: number
  engagement_rate: number
}

export interface EventAnomaly {
  timestamp: string
  type: 'spike' | 'drop' | 'sentiment_shift'
  metric: string
  value: number
  expected: number
  confidence: number
}

export interface EventPeak {
  timestamp: string
  hotness: number
  peak_type: 'global' | 'local'
  metrics: {
    post_count: number
    user_count: number
    engagement_rate: number
  }
}

// 从 SDK 重新导出 UserRelationNetwork
export type { UserRelationNetwork } from '@sker/sdk'
