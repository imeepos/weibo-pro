import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EventsController } from '@sker/sdk'
import type { UserRelationNetwork } from '@sker/sdk'
import { root } from '@sker/core'
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Heart,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Target,
  Minus,
  Globe,
  Network,
  Sprout,
  Clock,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Layers,
  LineChart,
  Pencil,
  X,
  MessageCircle,
  Share2,
  ThumbsUp,
  TrendingUp
} from 'lucide-react';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import { Input } from '@sker/ui/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@sker/ui/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sker/ui/components/ui/dialog';

import MiniTrendChart from '@/components/charts/MiniTrendChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import UserRelationGraph3DOffscreen from '@/components/charts/UserRelationGraph3DOffscreen';
import SentimentHotnessScatterChart from '@/components/charts/SentimentHotnessScatterChart';
import SentimentIntensityChart from '@/components/charts/SentimentIntensityChart';
import EngagementTrendChart from '@/components/charts/EngagementTrendChart';
import MultiMetricTrendChart from '@/components/charts/MultiMetricTrendChart';
import AnomalyTimelineChart from '@/components/charts/AnomalyTimelineChart';

interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

interface TrendChartData {
  hotnessData: number[];
  sentimentData: number[];
  postData: number[];
  userData: number[];
}

interface GeographicDataPoint {
  region: string;
  posts: number;
  users: number;
  sentiment: number;
}

interface EventDetailData {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: { positive: number; negative: number; neutral: number; };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  timeline: Array<{ time: string; event: string; type: string; impact: number; description: string; metrics: { posts: number; users: number; sentiment: number; } }>;
  propagationPath: Array<{ userType: string; userCount: number; postCount: number; influence: number; }>;
  keyNodes: Array<{ time: string; description: string; impact: 'high' | 'medium' | 'low'; metrics: { posts: number; users: number; sentiment: number; }; }>;
  developmentPhases: Array<{ phase: string; timeRange: string; description: string; keyEvents: string[]; keyTasks: string[]; keyMeasures: string[]; metrics: { hotness: number; posts: number; users: number; sentiment: number; }; status: 'completed' | 'ongoing' | 'planned'; }>;
  developmentPattern?: { outbreakSpeed: string; propagationScope: string; duration: string; impactDepth: string; };
  successFactors?: Array<{ title: string; description: string; }>;
}

const logger = createLogger('EventDetail');

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendChartData | null>(null);
  const [userRelationNetwork, setUserRelationNetwork] = useState<UserRelationNetwork | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicDataPoint[]>([]);
  const [keywordData, setKeywordData] = useState<Array<{ keyword: string; weight: number; sentiment: 'positive' | 'negative' | 'neutral' }>>([]);
  const [sentimentHotnessData, setSentimentHotnessData] = useState<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>([]);
  const [sentimentIntensityData, setSentimentIntensityData] = useState<Array<{ intensity: number; count: number }>>([]);
  const [engagementTrendData, setEngagementTrendData] = useState<Array<{ timestamp: string; post_count: number; comment_count: number; repost_count: number; like_count: number; user_count: number; hotness: number; engagement_rate: number; }>>([]);
  const [anomaliesData, setAnomaliesData] = useState<Array<{ timestamp: string; type: 'spike' | 'drop' | 'sentiment_shift'; metric: string; value: number; expected: number; confidence: number; }>>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchEventData = async (showRefresh = false) => {
    if (!eventId) {
      navigate('/event-analysis');
      return;
    }
    try {
      if (showRefresh) setIsRefreshing(true);
      const c = root.get(EventsController)

      const eventData = await c.getEventDetail(eventId);
      const convertedEventData: EventDetailData = {
        id: eventData.id, title: eventData.title, description: eventData.description || '',
        postCount: eventData.postCount, userCount: eventData.userCount,
        sentiment: eventData.sentiment, hotness: eventData.hotness,
        trend: eventData.trend, category: eventData.category,
        keywords: eventData.keywords, createdAt: eventData.createdAt, lastUpdate: eventData.lastUpdate,
        timeline: eventData.timeline || [], propagationPath: eventData.propagationPath || [],
        keyNodes: eventData.keyNodes || [],
        developmentPhases: (eventData as any).developmentPhases || [],
        developmentPattern: (eventData as any).developmentPattern,
        successFactors: (eventData as any).successFactors
      };
      setEventData(convertedEventData);

      const timeSeriesData = await c.getEventTimeSeries(eventId);
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
              positive, negative, neutral
            });
          }
        }
        // 按时间戳排序
        convertedTimeSeries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      setTimeSeriesData(convertedTimeSeries);

      const trendData = await c.getEventTrends(eventId);
      setTrendData({ hotnessData: trendData.hotnessData || [], sentimentData: trendData.sentimentScores || [], postData: trendData.postVolume || [], userData: trendData.userEngagement || [] });

      const userRelationData = await c.getEventUserRelations(eventId);
      setUserRelationNetwork(userRelationData);

      const geographicData = await c.getEventGeographic(eventId);
      setGeographicData(geographicData.map(item => ({ region: item.region, posts: item.posts, users: item.count, sentiment: item.sentiment })));

      const keywordsData = await c.getEventKeywords(eventId);
      setKeywordData(keywordsData.map(item => ({ keyword: item.keyword, weight: item.weight, sentiment: item.sentiment as 'positive' | 'negative' | 'neutral' })));

      try { setSentimentHotnessData(await c.getSentimentHotness(eventId) || []); } catch (e) { logger.warn('Failed to fetch sentiment hotness:', e); }
      try { setSentimentIntensityData(await c.getSentimentIntensity(eventId) || []); } catch (e) { logger.warn('Failed to fetch sentiment intensity:', e); }
      try { setEngagementTrendData(await c.getEngagementTrend(eventId, '168') || []); } catch (e) { logger.warn('Failed to fetch engagement trend:', e); }
      try { setAnomaliesData(await c.getAnomalies(eventId, '168') || []); } catch (e) { logger.warn('Failed to fetch anomalies:', e); }
    } catch (error) {
      logger.error('Failed to fetch event data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchEventData(); }, [eventId]);

  const openEditDialog = () => {
    if (eventData) {
      setEditingKeywords([...eventData.keywords]);
      setKeywordInput('');
      setEditDialogOpen(true);
    }
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingKeywords([]);
    setKeywordInput('');
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !editingKeywords.includes(trimmed)) {
      setEditingKeywords([...editingKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setEditingKeywords(editingKeywords.filter(k => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const saveKeywords = async () => {
    if (!eventId || !eventData) return;
    setIsSaving(true);
    try {
      const c = root.get(EventsController);
      await c.updateEventKeywords(eventId, { keywords: editingKeywords });
      setEventData({ ...eventData, keywords: editingKeywords });
      closeEditDialog();
    } catch (error) {
      logger.error('Failed to update keywords:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTrendConfig = (trend: EventDetailData['trend']) => {
    switch (trend) {
      case 'up': return { icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-400/10', label: '上升' };
      case 'down': return { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-400/10', label: '下降' };
      default: return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/30', label: '平稳' };
    }
  };

  const getSentimentConfig = (s: EventDetailData['sentiment']) => {
    const max = Math.max(s.positive, s.negative, s.neutral);
    if (max === s.positive) return { color: 'text-success', label: '正面', percent: Math.round(s.positive * 100) };
    if (max === s.negative) return { color: 'text-destructive', label: '负面', percent: Math.round(s.negative * 100) };
    return { color: 'text-muted-foreground', label: '中性', percent: Math.round(s.neutral * 100) };
  };

  const sentimentConfig = useMemo(() => eventData ? getSentimentConfig(eventData.sentiment) : null, [eventData]);
  const trendConfig = useMemo(() => eventData ? getTrendConfig(eventData.trend) : null, [eventData]);

  // 统计计算
  const stats = useMemo(() => {
    if (!trendData) {
      return null;
    }
    const hasData = trendData.hotnessData.length > 0 || trendData.sentimentData.length > 0;
    const totalPosts = trendData.postData.reduce((a, b) => a + b, 0);
    const totalUsers = trendData.userData.reduce((a, b) => a + b, 0);
    const avgHotness = hasData && trendData.hotnessData.length > 0
      ? Math.round(trendData.hotnessData.reduce((a, b) => a + b, 0) / trendData.hotnessData.length)
      : null;
    const avgSentiment = hasData && trendData.sentimentData.length > 0
      ? Math.round(trendData.sentimentData.reduce((a, b) => a + b, 0) / trendData.sentimentData.length)
      : null;

    return { totalPosts, totalUsers, avgHotness, avgSentiment };
  }, [trendData]);

  // 互动指标统计
  const engagementStats = useMemo(() => {
    if (!engagementTrendData.length) {
      return null;
    }
    const totalComments = engagementTrendData.reduce((sum, d) => sum + d.comment_count, 0);
    const totalReposts = engagementTrendData.reduce((sum, d) => sum + d.repost_count, 0);
    const totalLikes = engagementTrendData.reduce((sum, d) => sum + d.like_count, 0);
    const totalEngagement = totalComments + totalReposts + totalLikes;
    const avgEngagementRate = engagementTrendData.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) / engagementTrendData.length;

    return { totalComments, totalReposts, totalLikes, totalEngagement, avgEngagementRate };
  }, [engagementTrendData]);

  // 加载骨架
  if (!eventData) {
    return (
      <div className="space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

  const TrendIcon = trendConfig?.icon || Minus;

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/event-analysis')}
            className="h-9 w-9 hover:bg-muted/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">事件详情</h1>
              <p className="text-xs text-muted-foreground">
                更新于 {formatRelativeTime(eventData.lastUpdate)}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchEventData(true)}
          disabled={isRefreshing}
          className="h-9 w-9 hover:bg-muted/50"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* 事件信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-muted/20 border border-border/40"
        onClick={(e) => {
          console.log('[motion.div] onClick');
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          console.log('[motion.div] onPointerDown');
          e.stopPropagation();
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-transparent pointer-events-none" />
        <div
          className="relative p-5"
          onClick={(e) => {
            console.log('[card content] onClick');
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            console.log('[card content] onPointerDown');
            e.stopPropagation();
          }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h2 className="text-xl font-bold text-foreground truncate">{eventData.title}</h2>
                <Badge variant="secondary" className="text-xs">{eventData.category}</Badge>
                {eventData.hotness >= 90 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    热门
                  </Badge>
                )}
                {trendConfig && (
                  <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", trendConfig.bg, trendConfig.color)}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    {trendConfig.label}
                  </div>
                )}
                <Dialog
                  open={editDialogOpen}
                  onOpenChange={(open) => {
                    console.log('[Dialog] onOpenChange:', open);
                    setEditDialogOpen(open);
                  }}
                  modal={true}
                  onPointerDownOutside={(e) => {
                    console.log('[Dialog] onPointerDownOutside:', e.target.outerHTML?.slice(0, 100));
                    // e.preventDefault();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        console.log('[Pencil Button] onClick');
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-lg"
                    onPointerDownOutside={(e) => {
                      console.log('[DialogContent] onPointerDownOutside:', e.target.outerHTML?.slice(0, 100));
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      console.log('[DialogContent] onClick:', e.target.outerHTML?.slice(0, 100));
                      e.stopPropagation();
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        编辑事件关键字
                      </DialogTitle>
                      <DialogDescription>
                        调整事件的关键字以优化监测和分类效果
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-muted/30 rounded-lg border border-border/50">
                        {editingKeywords.length === 0 ? (
                          <div className="flex items-center justify-center w-full text-muted-foreground text-sm">
                            暂无关键字，点击下方添加
                          </div>
                        ) : (
                          editingKeywords.map(keyword => (
                            <span
                              key={keyword}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/15 text-primary text-sm rounded-full font-medium group transition-all hover:bg-primary/20"
                            >
                              #{keyword}
                              <button
                                type="button"
                                onClick={(e) => {
                                  console.log('[Remove keyword] onClick:', keyword);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeKeyword(keyword);
                                }}
                                className="ml-0.5 p-0.5 rounded-full hover:bg-primary/30 transition-colors"
                                title="移除关键字"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="输入新关键字"
                          value={keywordInput}
                          onChange={(e) => {
                            console.log('[native input] onChange');
                            setKeywordInput(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            console.log('[native input] onKeyDown:', e.key);
                            handleKeyDown(e);
                          }}
                          onMouseDown={(e) => {
                            console.log('[native input] onMouseDown');
                            e.preventDefault();
                          }}
                          onFocus={(e) => {
                            console.log('[native input] onFocus');
                            e.preventDefault();
                          }}
                          className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addKeyword}
                            disabled={!keywordInput.trim()}
                            className="shrink-0"
                          >
                            添加
                          </Button>
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={closeEditDialog}>
                          取消
                        </Button>
                        <Button
                          type="button"
                          onClick={saveKeywords}
                          disabled={isSaving || editingKeywords.length === 0}
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              保存中...
                            </>
                          ) : (
                            '保存'
                          )}
                        </Button>
                      </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{eventData.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {eventData.keywords.slice(0, 5).map(keyword => (
                  <span key={keyword} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center w-20 shrink-0">
              <div className="text-4xl font-bold text-foreground">{eventData.hotness}</div>
              <div className="text-xs text-muted-foreground">热度指数</div>
              {sentimentConfig && (
                <div className={cn("text-xs font-medium mt-2", sentimentConfig.color)}>
                  {sentimentConfig.label} {sentimentConfig.percent}%
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 核心指标 - 4列网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="贴子总数"
          value={stats?.totalPosts ?? eventData.postCount ?? 0}
          icon={MessageSquare}
          color="blue"
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="参与用户"
          value={stats?.totalUsers ?? eventData.userCount ?? 0}
          icon={Users}
          color="green"
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="平均热度"
          value={stats?.avgHotness ?? Number(eventData.hotness) ?? 0}
          icon={Zap}
          color="red"
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="情感得分"
          value={stats?.avgSentiment ?? (eventData.sentiment?.positive ?? 0) * 100}
          suffix="%"
          icon={Heart}
          color="purple"
          className="group hover:border-primary/30 transition-all duration-300"
        />
      </div>

      {/* 互动指标 - 4列网格 */}
      {engagementStats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            互动指标
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="评论总数"
              value={engagementStats.totalComments}
              icon={MessageCircle}
              color="blue"
              className="group hover:border-primary/30 transition-all duration-300"
            />
            <MetricCard
              title="点赞总数"
              value={engagementStats.totalLikes}
              icon={ThumbsUp}
              color="red"
              className="group hover:border-primary/30 transition-all duration-300"
            />
            <MetricCard
              title="转发总数"
              value={engagementStats.totalReposts}
              icon={Share2}
              color="green"
              className="group hover:border-primary/30 transition-all duration-300"
            />
            <MetricCard
              title="互动总量"
              value={engagementStats.totalEngagement}
              icon={Activity}
              color="yellow"
              className="group hover:border-primary/30 transition-all duration-300"
            />
          </div>
        </motion.div>
      )}

      {/* Tab 导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted/20 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">总览</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="data-[state=active]:bg-primary/20 gap-2">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">关系网络</span>
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-primary/20 gap-2">
            <LineChart className="w-4 h-4" />
            <span className="hidden sm:inline">趋势分析</span>
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="data-[state=active]:bg-primary/20 gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">情感分析</span>
          </TabsTrigger>
        </TabsList>

        {/* 总览 Tab */}
        <TabsContent value="overview" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 情感趋势 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  情感变化趋势
                </h3>
                <TimeSeriesChart data={timeSeriesData} title="" height={280} />
              </div>
              {/* 关键词云 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Sprout className="w-4 h-4" />
                  事件关键词云
                </h3>
                <WordCloudChart title="" height={280} maxWords={100} data={keywordData} />
              </div>
            </div>
            {/* 互动指标分解 */}
            <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                互动指标趋势
              </h3>
              <EngagementTrendChart data={engagementTrendData} height={280} />
            </div>
          </motion.div>
        </TabsContent>

        {/* 关系网络 Tab */}
        <TabsContent value="network" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                用户关系网络
              </h3>
              {userRelationNetwork && userRelationNetwork.nodes.length > 0 ? (
                <div className="h-[550px]">
                  <UserRelationGraph3DOffscreen network={userRelationNetwork} className="w-full h-full" edgeThreshold={10} />
                </div>
              ) : (
                <div className="h-[550px] flex items-center justify-center text-muted-foreground">
                  暂无用户关系数据
                </div>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* 趋势分析 Tab */}
        <TabsContent value="trend" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                核心指标时间趋势
              </h3>
              <MultiMetricTrendChart data={engagementTrendData} height={380} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  互动指标分解
                </h3>
                <EngagementTrendChart data={engagementTrendData} height={300} />
              </div>
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  异常检测时间线
                </h3>
                <AnomalyTimelineChart data={anomaliesData} height={300} />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* 情感分析 Tab */}
        <TabsContent value="sentiment" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                情感变化趋势
              </h3>
              <TimeSeriesChart data={timeSeriesData} title="" height={320} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  情感-热度关联
                </h3>
                <SentimentHotnessScatterChart title="" height={350} data={sentimentHotnessData} />
              </div>
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  情感强度谱
                </h3>
                <SentimentIntensityChart title="" height={350} data={sentimentIntensityData} />
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDetail;
