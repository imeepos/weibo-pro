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
  positive: { value: number; change: number };
  negative: { value: number; change: number };
  neutral: { value: number; change: number };
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

export interface HotEvent {
  id: string;
  title: string;
  postCount: number;
  sentiment: { positive: number; negative: number; neutral: number };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  trendData: number[];
}

export interface KeywordData {
  keyword: string;
  weight: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// 时间范围类型
export type TimeRange =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'halfYear'
  | 'lastHalfYear'
  | 'thisYear'
  | 'lastYear'
  | 'all';