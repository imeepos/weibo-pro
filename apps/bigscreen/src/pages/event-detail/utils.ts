import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type {
  EventDetailData,
  TimeSeriesDataPoint,
  TrendChartData,
} from './types';

export type KeywordItem = {
  keyword: string;
  weight: number;
  sentiment: 'positive' | 'negative' | 'neutral';
};

export type EngagementTrendItem = {
  timestamp: string;
  post_count: number;
  comment_count: number;
  repost_count: number;
  like_count: number;
  user_count: number;
  hotness: number;
  engagement_rate: number;
};

export interface EngagementStats {
  totalComments: number;
  totalReposts: number;
  totalLikes: number;
  totalEngagement: number;
  avgEngagementRate: number;
}

export interface TrendStats {
  totalPosts: number;
  totalUsers: number;
  avgHotness: number | null;
  avgSentiment: number | null;
}

export interface TrendConfig {
  icon: typeof ArrowUpRight;
  color: string;
  bg: string;
  label: string;
}

export interface SentimentConfig {
  color: string;
  label: string;
  percent: number;
}

/** 转换事件基础数据 */
export function convertEventData(eventData: any): EventDetailData {
  return {
    id: eventData.id,
    title: eventData.title,
    description: eventData.description || '',
    postCount: eventData.postCount,
    userCount: eventData.userCount,
    sentiment: eventData.sentiment,
    hotness: eventData.hotness,
    trend: eventData.trend,
    category: eventData.category,
    keywords: eventData.keywords,
    createdAt: eventData.createdAt,
    lastUpdate: eventData.lastUpdate,
    timeline: eventData.timeline || [],
    propagationPath: eventData.propagationPath || [],
    keyNodes: eventData.keyNodes || [],
    developmentPhases: (eventData as any).developmentPhases || [],
    developmentPattern: (eventData as any).developmentPattern,
    successFactors: (eventData as any).successFactors,
  };
}

/** 转换时间序列数据为图表数据点 */
export function convertTimeSeries(timeSeriesData: any): TimeSeriesDataPoint[] {
  const convertedTimeSeries: TimeSeriesDataPoint[] = [];
  if (timeSeriesData?.categories && Array.isArray(timeSeriesData.categories)) {
    const categories = timeSeriesData.categories;
    const postCountSeries = timeSeriesData.series?.find((s: any) => s.name === '帖子数量')?.data || [];
    const positiveSeries = timeSeriesData.series?.find((s: any) => s.name === '正面情绪')?.data || [];
    const negativeSeries = timeSeriesData.series?.find((s: any) => s.name === '负面情绪')?.data || [];
    const neutralSeries = timeSeriesData.series?.find((s: any) => s.name === '中性情绪')?.data || [];
    for (let i = 0; i < categories.length; i++) {
      const postCount = postCountSeries[i] != null ? Number(postCountSeries[i]) : 0;
      const positiveRatio = positiveSeries[i] != null ? Number(positiveSeries[i]) : null;
      const negativeRatio = negativeSeries[i] != null ? Number(negativeSeries[i]) : null;
      const neutralRatio = neutralSeries[i] != null ? Number(neutralSeries[i]) : null;

      // 计算绝对数量 = 帖子总数 × 情感比例
      const positive = postCount > 0 && positiveRatio !== null ? Math.round(postCount * positiveRatio) : null;
      const negative = postCount > 0 && negativeRatio !== null ? Math.round(postCount * negativeRatio) : null;
      const neutral = postCount > 0 && neutralRatio !== null ? Math.round(postCount * neutralRatio) : null;

      if (postCount > 0) {
        convertedTimeSeries.push({
          timestamp: categories[i] || '',
          value: postCount,
          positive,
          negative,
          neutral,
        });
      }
    }
    // 按时间戳排序
    convertedTimeSeries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }
  return convertedTimeSeries;
}

/** 转换趋势数据 */
export function convertTrendData(trendData: any): TrendChartData {
  return {
    hotnessData: trendData.hotnessData || [],
    sentimentData: trendData.sentimentScores || [],
    postData: trendData.postVolume || [],
    userData: trendData.userEngagement || [],
    totalPosts: trendData.totalPosts, // 保存真实的总帖子数
  };
}

/** 转换关键词数据 */
export function convertKeywords(keywordsData: any[]): KeywordItem[] {
  return keywordsData.map((item) => ({
    keyword: item.keyword,
    weight: item.weight,
    sentiment: item.sentiment as 'positive' | 'negative' | 'neutral',
  }));
}

/** 计算核心指标统计 */
export function computeStats(trendData: TrendChartData | null): TrendStats | null {
  if (!trendData) {
    return null;
  }
  const hasData = trendData.hotnessData.length > 0 || trendData.sentimentData.length > 0;

  // 优先使用后端返回的真实总帖子数，确保与地理分布统计一致
  const totalPosts = trendData.totalPosts ?? trendData.postData.reduce((a, b) => a + b, 0);
  const totalUsers = trendData.userData.reduce((a, b) => a + b, 0);
  const avgHotness = hasData && trendData.hotnessData.length > 0
    ? Math.round(trendData.hotnessData.reduce((a, b) => a + b, 0) / trendData.hotnessData.length)
    : null;
  const avgSentiment = hasData && trendData.sentimentData.length > 0
    ? Math.round(trendData.sentimentData.reduce((a, b) => a + b, 0) / trendData.sentimentData.length)
    : null;

  return { totalPosts, totalUsers, avgHotness, avgSentiment };
}

/** 计算互动指标统计 */
export function computeEngagementStats(engagementTrendData: EngagementTrendItem[]): EngagementStats | null {
  if (!engagementTrendData.length) {
    return null;
  }
  const totalComments = engagementTrendData.reduce((sum, d) => sum + d.comment_count, 0);
  const totalReposts = engagementTrendData.reduce((sum, d) => sum + d.repost_count, 0);
  const totalLikes = engagementTrendData.reduce((sum, d) => sum + d.like_count, 0);
  const totalEngagement = totalComments + totalReposts + totalLikes;
  const avgEngagementRate = engagementTrendData.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) / engagementTrendData.length;

  return { totalComments, totalReposts, totalLikes, totalEngagement, avgEngagementRate };
}

/** 趋势配置 */
export function getTrendConfig(trend: EventDetailData['trend']): TrendConfig {
  switch (trend) {
    case 'up': return { icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-400/10', label: '上升' };
    case 'down': return { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-400/10', label: '下降' };
    default: return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/30', label: '平稳' };
  }
}

/** 情感配置 */
export function getSentimentConfig(s: EventDetailData['sentiment']): SentimentConfig {
  const max = Math.max(s.positive, s.negative, s.neutral);
  if (max === s.positive) return { color: 'text-success', label: '正面', percent: Math.round(s.positive * 100) };
  if (max === s.negative) return { color: 'text-destructive', label: '负面', percent: Math.round(s.negative * 100) };
  return { color: 'text-muted-foreground', label: '中性', percent: Math.round(s.neutral * 100) };
}
