/**
 * 情感分析API服务
 */

import { root } from '@sker/core';
import { SentimentController, type TimeRange } from '@sker/sdk';
import type { HotTopic, SentimentTimeSeriesItem, SearchResult } from '../../types';

// 实时数据类型
export interface SentimentRealTimeData {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  trend: {
    positive: 'up' | 'down' | 'stable';
    negative: 'up' | 'down' | 'stable';
    neutral: 'up' | 'down' | 'stable';
  };
}

// 统计数据类型
export interface SentimentStatistics {
  totalAnalyzed: number;
  positive: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  negative: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  neutral: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  overallScore: number;
  confidenceLevel: number;
}

// HotTopic 类型已在上面导入

// 关键词类型
export interface SentimentKeyword {
  keyword: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  weight: number;
  associatedTopics: string[];
  frequency: number;
}

// 时间序列数据类型
export type SentimentTimeSeries = SentimentTimeSeriesItem;

// 地理位置数据类型
export interface SentimentLocationData {
  region: string;
  province?: string;
  city?: string;
  coordinates?: [number, number];
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  avgScore: number;
  dominantSentiment: 'positive' | 'negative' | 'neutral';
}

// 最新帖子类型
export interface RecentPost {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  confidence: number;
  publishTime: string;
  location?: string;
  tags: string[];
  interactions: {
    likes: number;
    comments: number;
    shares: number;
  };
}

// 搜索过滤器类型
export interface SentimentSearchFilters {
  sentiment?: 'positive' | 'negative' | 'neutral';
  timeRange?: TimeRange;
  location?: string;
  author?: string;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  sortBy?: 'time' | 'score' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export const SentimentAPI = {
  // 获取实时数据
  getRealTimeData: async (timeRange: TimeRange = '24h'): Promise<SentimentRealTimeData> => {
    const sentimentController = root.get(SentimentController);
    return await sentimentController.getRealtimeData(timeRange) as SentimentRealTimeData;
  },

  // 获取统计数据
  getStatistics: async (timeRange: TimeRange = '24h'): Promise<SentimentStatistics> => {
    const sentimentController = root.get(SentimentController);
    return await sentimentController.getStatistics(timeRange) as SentimentStatistics;
  },

  // 获取热点话题
  getHotTopics: async (timeRange: TimeRange = '24h', limit: number = 10): Promise<HotTopic[]> => {
    const sentimentController = root.get(SentimentController);
    // 注意：SDK 不支持 limit 参数，返回所有数据后前端截取
    const data = await sentimentController.getHotTopics(timeRange);
    return (data as any[]).slice(0, limit) as HotTopic[];
  },

  // 获取关键词
  getKeywords: async (timeRange: TimeRange = '24h', limit: number = 50): Promise<SentimentKeyword[]> => {
    const sentimentController = root.get(SentimentController);
    // 注意：SDK 不支持 limit 参数，返回所有数据后前端截取
    const data = await sentimentController.getKeywords(timeRange);
    return (data as any[]).slice(0, limit) as SentimentKeyword[];
  },

  // 获取时间序列数据
  getTimeSeries: async (timeRange: TimeRange = '24h'): Promise<SentimentTimeSeries[]> => {
    const sentimentController = root.get(SentimentController);
    return await sentimentController.getTimeSeries(timeRange) as SentimentTimeSeries[];
  },

  // 获取地理位置数据
  getLocationData: async (timeRange: TimeRange = '24h'): Promise<SentimentLocationData[]> => {
    const sentimentController = root.get(SentimentController);
    return await sentimentController.getLocations(timeRange) as SentimentLocationData[];
  },

  // 获取最新帖子
  getRecentPosts: async (timeRange: TimeRange = '24h', limit: number = 20): Promise<RecentPost[]> => {
    const sentimentController = root.get(SentimentController);
    // 注意：SDK 不支持 limit 参数，返回所有数据后前端截取
    const data = await sentimentController.getRecentPosts(timeRange);
    return (data as any[]).slice(0, limit) as RecentPost[];
  },

  // 搜索相关内容
  search: async (query: string, filters?: SentimentSearchFilters): Promise<SearchResult> => {
    const sentimentController = root.get(SentimentController);
    return await sentimentController.search({ keyword: query, timeRange: filters?.timeRange }) as SearchResult;
  },
};