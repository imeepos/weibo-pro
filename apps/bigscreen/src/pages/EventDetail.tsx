import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EventsController } from '@sker/sdk'
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
  Globe,
  Network,
  Clock
} from 'lucide-react';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sker/ui/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@sker/ui/components/ui/tabs';
import { Skeleton } from '@sker/ui/components/ui/skeleton';

import MiniTrendChart from '@/components/charts/MiniTrendChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import GeographicChart from '@/components/charts/GeographicChart';
import PropagationPathChart from '@/components/charts/PropagationPathChart';
import EventTimelineChart from '@/components/charts/EventTimelineChart';
import EventDevelopmentChart from '@/components/charts/EventDevelopmentChart';
import InfluenceNetworkFlow from '@/components/charts/InfluenceNetworkFlow';

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
  const [influenceUsers, setInfluenceUsers] = useState<InfluenceUser[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicDataPoint[]>([]);
  const [keywordData, setKeywordData] = useState<Array<{ keyword: string; weight: number; sentiment: 'positive' | 'negative' | 'neutral' }>>([]);
  type EventTab = 'overview' | 'timeline' | 'propagation' | 'analysis' | 'development';
  const [activeTab, setActiveTab] = useState<EventTab>('overview');
  const sentimentLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
  const toSentimentLevel = (value: number) => {
    const normalized = Math.round(value / 10);
    const index = Math.min(sentimentLevels.length - 1, Math.max(0, normalized - 1));
    return sentimentLevels[index]!;
  };
  const tabs: ReadonlyArray<{ id: EventTab; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: '概览分析', icon: BarChart3 },
    { id: 'timeline', label: '发展时间线', icon: Clock },
    { id: 'propagation', label: '传播路径', icon: Network },
    { id: 'development', label: '发展路径', icon: Activity },
    { id: 'analysis', label: '深度分析', icon: Target }
  ];

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
        // API 返回的是 { categories: string[], series: Array<{name, data}> } 格式
        const convertedTimeSeries: TimeSeriesDataPoint[] = [];
        if (timeSeriesData?.categories && Array.isArray(timeSeriesData.categories)) {
          const categories = timeSeriesData.categories;
          const postSeries = timeSeriesData.series?.find(s => s.name === '帖子数量')?.data || [];
          const userSeries = timeSeriesData.series?.find(s => s.name === '用户参与')?.data || [];
          const positiveSeries = timeSeriesData.series?.find(s => s.name === '正面情绪')?.data || [];
          const negativeSeries = timeSeriesData.series?.find(s => s.name === '负面情绪')?.data || [];
          const neutralSeries = timeSeriesData.series?.find(s => s.name === '中性情绪')?.data || [];

          for (let i = 0; i < categories.length; i++) {
            convertedTimeSeries.push({
              timestamp: categories[i] || '',
              value: (postSeries[i] || 0) + (userSeries[i] || 0),
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

        // 获取影响力用户数据
        const influenceUsersData = await c.getInfluenceUsers(eventId);
        // 转换为页面期望的 InfluenceUser 格式，添加防御性检查
        const convertedInfluenceUsers: InfluenceUser[] = influenceUsersData
          .filter(user => user?.userId && user?.username) // 过滤掉无效数据
          .map(user => ({
            id: user.userId,
            name: user.username,
            type: 'user',
            influence: user.influence ?? 0,
            followers: (user.followers ?? 0).toString(),
            posts: user.postCount ?? 0,
            engagement: (user.interactionCount ?? 0).toString()
          }));
        setInfluenceUsers(convertedInfluenceUsers);

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
              {[1, 2, 3, 4, 5].map((i) => (
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
        <CardContent className="p-8">
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
              <div className="flex flex-wrap gap-2">
                {eventData.keywords.map(keyword => (
                  <Badge key={keyword} variant="outline" className="bg-primary/10 text-primary">
                    #{keyword}
                  </Badge>
                ))}
              </div>
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

      {/* 标签页导航 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EventTab)} className="w-full">
        <div className="border-b px-0">
          <TabsList className="h-auto bg-transparent p-0">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex items-center font-medium text-sm transition-colors',
                  'bg-transparent shadow-none rounded-none',
                  'data-[state=active]:text-primary data-[state=active]:bg-transparent',
                  'data-[state=inactive]:text-muted-foreground',
                  'hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 标签页内容 */}
        <TabsContent value="overview" className="p-6 mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >

            {/* 趋势图表 */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-foreground mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                热度趋势分析
              </h3>
              <TimeSeriesChart
                data={timeSeriesData}
                title=""
                height={300}
              />
            </div>

            {/* 图表分析区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 关键词分析 */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-foreground mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  关键词热度
                </h3>
                <WordCloudChart
                  title=""
                  height={250}
                  maxWords={20}
                  data={keywordData}
                />
              </div>

              {/* 地理分布分析 */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-foreground mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  地理分布
                </h3>
                <GeographicChart
                  data={geographicData.map(item => ({
                    name: item.region,
                    value: item.users
                  }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="timeline" className="p-6 mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <EventTimelineChart data={eventData.timeline} />
          </motion.div>
        </TabsContent>

        <TabsContent value="propagation" className="p-6 mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <PropagationPathChart data={eventData.propagationPath} />

            {/* 影响力用户网络 */}
            <div className="bg-muted/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                用户影响力排名
              </h4>
              {/* 影响力网络图 */}
              <InfluenceNetworkFlow
                users={influenceUsers}
              />
            </div>

            {/* 地理传播分析 */}
            <div className="bg-muted/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                地理传播分析
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <GeographicChart
                    data={geographicData.map(item => ({
                      name: item.region,
                      value: item.users
                    }))}
                  />
                </div>
                <div className="space-y-4">
                  <h5 className="font-medium text-foreground">传播热点地区</h5>
                  <div className="space-y-3">
                    {geographicData.map((region: GeographicDataPoint, index: number) => (
                      <div key={region.region} className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-primary">#{index + 1}</span>
                          <span className="text-foreground">{region.region}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">{region.posts.toLocaleString()} 贴子</span>
                          <span className="text-muted-foreground">{region.users.toLocaleString()} 用户</span>
                          <span className={cn(
                            'font-semibold',
                            region.sentiment > 0.6 ? 'text-green-400' :
                              region.sentiment < 0.4 ? 'text-red-400' : 'text-yellow-400'
                          )}>
                            {(region.sentiment * 100).toFixed(0)}% 正面
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="development" className="p-6 mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <EventDevelopmentChart phases={eventData.developmentPhases} />
          </motion.div>
        </TabsContent>

        <TabsContent value="analysis" className="p-6 mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 关键节点分析 */}
            <div className="bg-muted/20 rounded-lg p-6">
              <h3 className="text-foreground mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                关键节点分析
              </h3>

              <div className="space-y-4">
                {eventData.keyNodes.map((node, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card/50 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline" className="text-primary bg-primary/10">
                            {node.time}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              node.impact === 'high' && 'bg-red-500/20 text-red-400 border-red-500/30',
                              node.impact === 'medium' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                              node.impact === 'low' && 'bg-green-500/20 text-green-400 border-green-500/30'
                            )}
                          >
                            {node.impact === 'high' ? '高影响' : node.impact === 'medium' ? '中影响' : '低影响'}
                          </Badge>
                        </div>
                        <p className="text-foreground mb-4 text-base">{node.description}</p>
                        <div className="flex items-center space-x-8 text-sm">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground font-semibold">{formatNumber(node.metrics.posts)}</span>
                            <span className="text-muted-foreground">贴子</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground font-semibold">{formatNumber(node.metrics.users)}</span>
                            <span className="text-muted-foreground">用户</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground font-semibold">{(node.metrics.sentiment * 100).toFixed(1)}%</span>
                            <span className="text-muted-foreground">正面情感</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 深度分析洞察 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/20 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  事件发展模式
                </h4>
                {eventData.developmentPattern ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">爆发速度</span>
                      <span className="text-green-400 font-semibold">{eventData.developmentPattern.outbreakSpeed}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">传播范围</span>
                      <span className="text-blue-400 font-semibold">{eventData.developmentPattern.propagationScope}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">持续时间</span>
                      <span className="text-yellow-400 font-semibold">{eventData.developmentPattern.duration}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">影响深度</span>
                      <span className="text-red-400 font-semibold">{eventData.developmentPattern.impactDepth}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">暂无发展模式数据</div>
                )}
              </div>

              <div className="bg-muted/20 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  关键成功因素
                </h4>
                {eventData.successFactors && eventData.successFactors.length > 0 ? (
                  <div className="space-y-3">
                    {eventData.successFactors.map((factor, index) => {
                      const colors = ['green', 'blue', 'purple', 'yellow', 'red'];
                      const color = colors[index % colors.length];
                      return (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 bg-${color}-400 rounded-full mt-2`}></div>
                          <div>
                            <div className="text-foreground font-medium">{factor.title}</div>
                            <div className="text-muted-foreground text-sm">{factor.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">暂无成功因素分析</div>
                )}
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDetail;
