import { ArrowDownRight, ArrowUpRight, Heart, Minus } from 'lucide-react';
import type { TrendDataSeries } from '@sker/sdk';
import type { EventItem } from '@/types';
import type { EventStats, SentimentConfig, TrendConfig, TrendSeries } from './types';

/** 从 TrendDataSeries 中提取事件/贴子/用户/热度各系列数据 */
export const extractTrendSeries = (trendData: TrendDataSeries | null): TrendSeries => {
  if (!trendData?.series) return { events: [], posts: [], users: [], hotness: [] };
  return {
    events: trendData.series.find((s) => s.name === '事件数量')?.data || [],
    posts: trendData.series.find((s) => s.name === '贴子数量')?.data || [],
    users: trendData.series.find((s) => s.name === '参与用户')?.data || [],
    hotness: trendData.series.find((s) => s.name === '热度指数')?.data || [],
  };
};

/** 计算最近两点的变化率（保留一位小数） */
export const calcChange = (data: number[]): number => {
  if (data.length < 2) return 0;
  const current = data[data.length - 1];
  const previous = data[data.length - 2];
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/** 计算统计概览数据：优先使用后端 totals，否则回退到趋势最后一个点 */
export const computeStats = (trendData: TrendDataSeries | null, trendSeries: TrendSeries): EventStats => {
  const { events: e = [], posts: p = [], users: u = [], hotness: h = [] } = trendSeries;
  return {
    totalEvents: trendData?.totals?.totalEvents ?? (e.length > 0 ? e[e.length - 1] : 0),
    totalPosts: trendData?.totals?.totalPosts ?? (p.length > 0 ? p[p.length - 1] : 0),
    totalUsers: trendData?.totals?.totalUsers ?? (u.length > 0 ? u[u.length - 1] : 0),
    avgHotness: trendData?.totals?.avgHotness ?? (h.length > 0 ? Math.round(h.reduce((sum, v) => sum + v, 0) / h.length) : 0),
    eventChange: calcChange(e),
    postChange: calcChange(p),
    userChange: calcChange(u),
    hotnessChange: calcChange(h),
  };
};

/** 根据情感分布获取展示配置 */
export const getSentimentConfig = (sentiment: EventItem['sentiment']): SentimentConfig => {
  if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
    return { color: 'text-success', label: '正面', icon: Heart };
  } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
    return { color: 'text-destructive', label: '负面', icon: Heart };
  }
  return { color: 'text-muted-foreground', label: '中性', icon: Minus };
};

/** 根据趋势方向获取展示配置 */
export const getTrendConfig = (trend: EventItem['trend']): TrendConfig => {
  switch (trend) {
    case 'up': return { icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-400/10' };
    case 'down': return { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-400/10' };
    default: return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/30' };
  }
};

/** 构建分页页码列表（含省略号） */
export const buildPaginationPages = (totalPages: number, currentPage: number): (number | 'ellipsis')[] => {
  const pages: (number | 'ellipsis')[] = [];
  const showPages = new Set<number>();

  [1, totalPages, currentPage - 1, currentPage, currentPage + 1].forEach((p) => {
    if (p >= 1 && p <= totalPages) showPages.add(p);
  });

  const sortedPages = Array.from(showPages).sort((a, b) => a - b);

  sortedPages.forEach((page, idx) => {
    if (idx > 0 && page - sortedPages[idx - 1] > 1) pages.push('ellipsis');
    pages.push(page);
  });

  return pages;
};
