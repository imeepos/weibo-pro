import type {
  EventEntity,
  EventStatisticsEntity,
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
  developmentPhases: EventDevelopmentPhase[];
  developmentPattern: EventDevelopmentPattern;
  successFactors: EventSuccessFactor[];
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
