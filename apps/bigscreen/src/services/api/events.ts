/**
 * 事件相关API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, EventItem, HotEvent } from '../../types';

// 事件列表查询参数
export interface EventsListParams {
  category?: string;
  search?: string;
  limit?: number;
  timeRange?: string;
}

// 使用统一的 EventItem 类型
export type EventInfo = EventItem;

// 事件详情 - 扩展 EventItem
export interface EventDetail extends EventItem {
  content?: string;
  relatedUsers?: string[];
  relatedPosts?: string[];
  statistics?: {
    totalPosts: number;
    totalUsers: number;
    totalInteractions: number;
    peakTime: string;
  };
  timeline?: Array<{
    time: string;
    event: string;
    type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone';
    impact: number;
    description: string;
    metrics: { posts: number; users: number; sentiment: number };
  }>;
  propagationPath?: Array<{
    userType: string;
    userCount: number;
    postCount: number;
    influence: number;
  }>;
  keyNodes?: Array<{
    time: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    metrics: {
      posts: number;
      users: number;
      sentiment: number;
    };
  }>;
  developmentPhases?: Array<{
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
  }>;
  developmentPattern?: {
    outbreakSpeed: string;
    propagationScope: string;
    duration: string;
    impactDepth: string;
  };
  successFactors?: Array<{
    title: string;
    description: string;
  }>;
}

// 事件时间线项
export interface EventTimelineItem {
  timestamp: string;
  action: string;
  description: string;
  userId?: string;
  postId?: string;
}

// 事件分类
export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  count: number;
  color?: string;
}

// 事件趋势数据
export interface EventTrendData {
  date: string;
  count: number;
  category: string;
}

// HotEvent 类型已在上面导入

// 事件时间序列数据
export interface EventTimeSeriesData {
  timestamp: string;
  posts: number;
  users: number;
  interactions: number;
  positive: number;
  negative: number;
  neutral: number;
}

// 事件趋势图表数据
export interface EventTrendsChart {
  timeline: string[];
  postVolume: number[];
  sentimentScores: number[];
  userEngagement: number[];
  hotnessData: number[];
}

// 影响力用户
export interface InfluenceUser {
  userId: string;
  username: string;
  avatar?: string;
  followers: number;
  influence: number;
  postCount: number;
  interactionCount: number;
  sentimentScore: number;
}

// 地理分布数据
export interface EventGeographicData {
  region: string;
  province?: string;
  city?: string;
  count: number;
  coordinates?: [number, number];
  percentage: number;
  posts: number;
  sentiment: number;
}

export const EventsAPI = {
  // 获取事件列表
  getEventsList: async (params?: EventsListParams): Promise<EventInfo[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.timeRange) queryParams.append('timeRange', params.timeRange);

    const url = `/api/events/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<EventInfo[]>(url);
    return response;
  },

  // 获取事件分类
  getCategories: async (timeRange?: string): Promise<EventCategory[]> => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await apiClient.get<{ categories: string[]; counts: number[] }>(`/api/events/categories${params}`);
    // 转换API返回格式为 EventCategory[]
    const categories = response.categories || [];
    const counts = response.counts || [];
    return categories.map((name, index) => ({
      id: name,
      name: name,
      count: counts[index] || 0
    }));
  },

  // 获取事件趋势数据(返回图表用的聚合数据)
  getTrendData: async (timeRange?: string): Promise<{
    eventTrendData: number[];
    postTrendData: number[];
    userTrendData: number[];
    hotnessData: number[];
  } | null> => {
    try {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<{
        categories: string[];
        series: Array<{ name: string; data: number[] }>;
      }>(`/api/events/trend-data${params}`);

      // 转换API返回格式为组件需要的格式
      const seriesMap: Record<string, number[]> = {};
      (response.series || []).forEach(s => {
        seriesMap[s.name] = s.data;
      });

      // 生成默认的趋势数据 (如果后端返回空数据)
      const defaultData = Array(7).fill(0).map((_, i) => Math.floor(Math.random() * 100));

      return {
        eventTrendData: seriesMap['事件数量'] || defaultData,
        postTrendData: seriesMap['贴子数量'] || defaultData,
        userTrendData: seriesMap['参与用户'] || defaultData,
        hotnessData: seriesMap['热度指数'] || defaultData,
      };
    } catch (error) {
      return null;
    }
  },

  // 获取热门事件列表
  getHotList: async (timeRange?: string): Promise<HotEvent[]> => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return await apiClient.get<HotEvent[]>(`/api/events/hot-list${params}`);
  },

  // 获取事件详情
  getEventDetail: async (eventId: string): Promise<EventDetail> => {
    const response = await apiClient.get<EventDetail>(`/api/events/${eventId}`);
    return response;
  },

  // 获取事件时间序列数据
  getEventTimeSeries: async (eventId: string): Promise<EventTimeSeriesData[]> => {
    const response = await apiClient.get<{
      categories: string[];
      series: Array<{ name: string; data: number[] }>;
    }>(`/api/events/${eventId}/timeseries`);

    const { categories, series } = response;
    const seriesMap: Record<string, number[]> = {};
    series.forEach(s => {
      seriesMap[s.name] = s.data;
    });

    return categories.map((timestamp, index) => ({
      timestamp,
      posts: seriesMap['帖子数量']?.[index] || 0,
      users: seriesMap['用户参与']?.[index] || 0,
      interactions: 0,
      positive: seriesMap['正面情绪']?.[index] || 0,
      negative: seriesMap['负面情绪']?.[index] || 0,
      neutral: seriesMap['中性情绪']?.[index] || 0
    }));
  },

  // 获取事件趋势图表数据
  getEventTrends: async (eventId: string): Promise<EventTrendsChart> => {
    const response = await apiClient.get<EventTrendsChart>(`/api/events/${eventId}/trends`);
    return response;
  },

  // 获取影响力用户
  getInfluenceUsers: async (eventId: string): Promise<InfluenceUser[]> => {
    const response = await apiClient.get<InfluenceUser[]>(`/api/events/${eventId}/influence-users`);
    return response;
  },

  // 获取地理分布数据
  getGeographic: async (eventId: string): Promise<EventGeographicData[]> => {
    const response = await apiClient.get<EventGeographicData[]>(`/api/events/${eventId}/geographic`);
    return response;
  },
};