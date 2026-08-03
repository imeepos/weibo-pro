import type {
  EventEntity,
  TimeRange,
  HotEvent,
} from '@sker/entities';
import type { EventListItem, SentimentScore, GeographicResponse } from '@sker/sdk';

export type { HotEvent, TimeRange, EventListItem, SentimentScore, GeographicResponse };

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
  totalPosts?: number; // 真实的总帖子数（从 WeiboPostEntity 查询）
}
