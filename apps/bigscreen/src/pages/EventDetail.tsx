import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EventsController } from '@sker/sdk'
import type { UserRelationNetwork } from '@sker/sdk'
import { root } from '@sker/core'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  Heart,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Target,
  Minus,
  Globe
} from 'lucide-react';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sker/ui/components/ui/card';
import { Skeleton } from '@sker/ui/components/ui/skeleton';

import MiniTrendChart from '@/components/charts/MiniTrendChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import UserRelationGraph3DOffscreen from '@/components/charts/UserRelationGraph3DOffscreen';
import SentimentHotnessScatterChart from '@/components/charts/SentimentHotnessScatterChart';
import SentimentIntensityChart from '@/components/charts/SentimentIntensityChart';
import EngagementTrendChart from '@/components/charts/EngagementTrendChart';
import MultiMetricTrendChart from '@/components/charts/MultiMetricTrendChart';
import AnomalyTimelineChart from '@/components/charts/AnomalyTimelineChart';

// 时间序列数据接口 - 与 TimeSeriesChart 组件期望的格式匹配
interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

// 趋势图表数据接口
interface TrendChartData {
  hotnessData: number[];
  sentimentData: number[];
  postData: number[];
  userData: number[];
}

// 影响力用户接口
interface InfluenceUser {
  id: string;
  name: string;
  type: string;
  influence: number;
  followers: string;
  posts: number;
  engagement: string;
}

// 地理分布数据接口
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
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  // 详细分析数据
  timeline: Array<{
    time: string;
    event: string;
    type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone';
    impact: number;
    description: string;
    metrics: { posts: number, users: number, sentiment: number }
  }>;
  propagationPath: Array<{
    userType: string;
    userCount: number;
    postCount: number;
    influence: number;
  }>;
  keyNodes: Array<{
    time: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    metrics: {
      posts: number;
      users: number;
      sentiment: number;
    };
  }>;
  developmentPhases: Array<{
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

  // 新增状态
  const [sentimentHotnessData, setSentimentHotnessData] = useState<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>([]);
  const [sentimentIntensityData, setSentimentIntensityData] = useState<Array<{ confidence: number; count: number }>>([]);

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标状态
  const [engagementTrendData, setEngagementTrendData] = useState<Array<{
    timestamp: string;
    post_count: number;
    comment_count: number;
    repost_count: number;
    like_count: number;
    user_count: number;
    hotness: number;
    engagement_rate: number;
  }>>([]);
  const [anomaliesData, setAnomaliesData] = useState<Array<{
    timestamp: string;
    type: 'spike' | 'drop' | 'sentiment_shift';
    metric: string;
    value: number;
    expected: number;
    confidence: number;
  }>>([]);

  const sentimentLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
  const toSentimentLevel = (value: number) => {
    const normalized = Math.round(value / 10);
    const index = Math.min(sentimentLevels.length - 1, Math.max(0, normalized - 1));
    return sentimentLevels[index]!;
  };

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        navigate('/events');
        return;
      }
      try {
        // 获取事件详情数据
        const c = root.get(EventsController)
        const eventData = await c.getEventDetail(eventId);
        // 转换为 EventDetailData 格式
        const convertedEventData: EventDetailData = {
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
          developmentPhases: eventData.developmentPhases || [],
          developmentPattern: eventData.developmentPattern,
          successFactors: eventData.successFactors
        };
        setEventData(convertedEventData);

        // 获取时间序列数据（事件完整生命周期）
        const timeSeriesData = await c.getEventTimeSeries(eventId);
        logger.debug('原始时间序列数据:', timeSeriesData);

        // 转换为 TimeSeriesDataPoint 格式
        const convertedTimeSeries: TimeSeriesDataPoint[] = [];
        if (timeSeriesData?.categories && Array.isArray(timeSeriesData.categories)) {
          const categories = timeSeriesData.categories;
          const positiveSeries = timeSeriesData.series?.find(s => s.name === '正面情绪')?.data || [];
          const negativeSeries = timeSeriesData.series?.find(s => s.name === '负面情绪')?.data || [];
          const neutralSeries = timeSeriesData.series?.find(s => s.name === '中性情绪')?.data || [];

          for (let i = 0; i < categories.length; i++) {
            convertedTimeSeries.push({
              timestamp: categories[i] || '',
              value: (positiveSeries[i] || 0) + (negativeSeries[i] || 0) + (neutralSeries[i] || 0),
              positive: positiveSeries[i] || 0,
              negative: negativeSeries[i] || 0,
              neutral: neutralSeries[i] || 0
            });
          }
        } else {
          logger.warn('时间序列数据格式不正确:', timeSeriesData);
        }

        logger.debug('转换后的时间序列数据:', convertedTimeSeries);
        setTimeSeriesData(convertedTimeSeries);

        // 获取趋势数据
        const trendData = await c.getEventTrends(eventId);
        // 转换为 TrendChartData 格式
        const convertedTrendData: TrendChartData = {
          hotnessData: trendData.hotnessData || [],
          sentimentData: trendData.sentimentScores || [],
          postData: trendData.postVolume || [],
          userData: trendData.userEngagement || []
        };
        setTrendData(convertedTrendData);

        // 获取用户关系网络数据
        const userRelationData = await c.getEventUserRelations(eventId);
        setUserRelationNetwork(userRelationData);

        // 获取地理分布数据
        const geographicData = await c.getEventGeographic(eventId);
        const convertedGeographicData: GeographicDataPoint[] = geographicData.map(item => ({
          region: item.region,
          posts: item.posts,
          users: item.count,
          sentiment: item.sentiment
        }));
        setGeographicData(convertedGeographicData);

        // 获取关键词数据
        const keywordsData = await c.getEventKeywords(eventId);
        // 转换为 WordCloudChart 期望的格式
        const convertedKeywords = keywordsData.map(item => ({
          keyword: item.keyword,
          weight: item.weight,
          sentiment: item.sentiment as 'positive' | 'negative' | 'neutral'
        }));
        // 将关键词数据存储到状态中，以便传递给 WordCloudChart
        setKeywordData(convertedKeywords);

        // 新增：获取情感-热度散点图数据
        try {
          const sentimentHotness = await c.getSentimentHotness(eventId);
          setSentimentHotnessData(sentimentHotness || []);
        } catch (e) {
          logger.warn('Failed to fetch sentiment hotness data:', e);
        }

        // 新增：获取情感强度谱数据
        try {
          const sentimentIntensity = await c.getSentimentIntensity(eventId);
          setSentimentIntensityData(sentimentIntensity || []);
        } catch (e) {
          logger.warn('Failed to fetch sentiment intensity data:', e);
        }

        // 新增：获取基于 EventHourlyStatisticsEntity 的互动指标数据
        try {
          const engagementTrend = await c.getEngagementTrend(eventId, 168);
          setEngagementTrendData(engagementTrend || []);
        } catch (e) {
          logger.warn('Failed to fetch engagement trend data:', e);
        }

        try {
          const anomalies = await c.getAnomalies(eventId, 168);
          setAnomaliesData(anomalies || []);
        } catch (e) {
          logger.warn('Failed to fetch anomalies data:', e);
        }
      } catch (error) {
        logger.error('Failed to fetch event data:', error);
      }
    };

    fetchEventData();
  }, [eventId]);



  const getTrendIcon = (trend: EventDetailData['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  // 使用从 API 获取的趋势数据
  const trendChartData = useMemo<TrendChartData>(() => {
    if (!trendData) {
      return {
        hotnessData: [],
        sentimentData: [],
        postData: [],
        userData: []
      };
    }
    return trendData;
  }, [trendData]);

  const { hotnessData, sentimentData, postData, userData } = trendChartData;

  if (!eventData) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden space-y-8 p-6">
        {/* 标题骨架 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* 事件基本信息骨架 */}
        <Card className="sentiment-overview-card">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 指标卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* 标签页骨架 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-8 mb-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden space-y-8 p-6">
      {/* 页面标题和返回按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate('/event-analysis')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center">
              <div className="w-1 h-10 bg-gradient-to-b from-primary via-primary to-primary/30 rounded-full mr-4"></div>
              事件详情分析
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              深度分析事件发展轨迹和传播路径
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          最后更新: {formatRelativeTime(eventData.lastUpdate)}
        </div>
      </div>

      {/* 事件基本信息 */}
      <Card className="sentiment-overview-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <h2 className="text-2xl font-bold text-foreground">{eventData.title}</h2>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {eventData.category}
                </Badge>
                {getTrendIcon(eventData.trend)}
                {eventData.hotness >= 90 && (
                  <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    高热度事件
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-lg mb-4">{eventData.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground mb-2">{eventData.hotness}</div>
              <div className="text-muted-foreground">热度指数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 核心统计指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="贴子数量"
          className='sentiment-overview-card'
          value={eventData.postCount}
          change={25.3}
          icon={MessageSquare}
          color="green"
          chartComponent={<MiniTrendChart data={postData} color="#10b981" type="bar" />}
        />
        <MetricCard
          title="参与用户"
          className='sentiment-overview-card'
          value={eventData.userCount}
          change={18.7}
          icon={Users}
          color="purple"
          chartComponent={<MiniTrendChart data={userData} color="#8b5cf6" type="line" />}
        />
        <MetricCard
          title="热度趋势"
          className='sentiment-overview-card'
          value={eventData.hotness}
          change={15.2}
          icon={Zap}
          color="red"
          chartComponent={<MiniTrendChart data={hotnessData} color="#ef4444" type="line" />}
        />
        <MetricCard
          title="情感指数"
          className='sentiment-overview-card'
          value={eventData.sentiment.positive}
          change={8.5}
          icon={Heart}
          color="green"
          sentiment={{
            type: 'positive',
            level: toSentimentLevel(eventData.sentiment.positive)
          }}
          chartComponent={<MiniTrendChart data={sentimentData.map((v: number) => v * 100)} color="#10b981" type="line" />}
        />
      </div>

      {/* 单页内容布局 */}
      <div className="space-y-6">
        {/* 用户关系网络 */}
        <div className="bg-muted/20 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            用户关系网络
          </h4>
          {userRelationNetwork && userRelationNetwork.nodes.length > 0 ? (
            <div className="h-[500px]">
              <UserRelationGraph3DOffscreen
                network={userRelationNetwork}
                className="w-full h-full"
                edgeThreshold={10}
              />
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              暂无用户关系数据
            </div>
          )}
        </div>

        {/* 时间趋势区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          {/* 核心指标时间趋势图（MultiMetricTrendChart） */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-foreground mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                核心指标时间趋势
              </h3>
              <MultiMetricTrendChart data={engagementTrendData} height={320} />
            </div>

            {/* 互动指标分解图（EngagementTrendChart） */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-foreground mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                互动指标分解
              </h3>
              <EngagementTrendChart data={engagementTrendData} height={280} />
            </div>

            {/* 情感趋势图 */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-foreground mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                情感变化趋势
              </h3>
              <TimeSeriesChart
                data={timeSeriesData}
                title=""
                height={250}
              />
            </div>

            {/* 异常检测时间线（AnomalyTimelineChart） */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-foreground mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                异常检测时间线
              </h3>
              <AnomalyTimelineChart data={anomaliesData} height={250} />
            </div>

          {/* 事件关键词云 */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-foreground mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              事件关键词云
            </h3>
            <WordCloudChart
              title=""
              height={320}
              maxWords={50}
              data={keywordData}
            />
          </div>
        </motion.div>

        {/* 深度洞察区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 情感分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-muted/30 rounded-lg p-6">
              <SentimentHotnessScatterChart
                title="情感-热度关联分析"
                height={320}
                data={sentimentHotnessData}
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-6">
              <SentimentIntensityChart
                title="情感强度谱"
                height={320}
                data={sentimentIntensityData}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetail;
