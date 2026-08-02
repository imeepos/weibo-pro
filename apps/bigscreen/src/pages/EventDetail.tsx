import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  EventsController,
  SpreadBreadthController,
  MediaTypeController,
  CommunityDetectionController,
  PropagationVelocityController,
  InfluencePredictionController,
  CommunityEvolutionController,
  UserStratificationController,
  CommentDepthController,
  PostingTimeController,
  UserRelationController
} from '@sker/sdk'
import type {
  EventAbnormalUser,
  EventAnomaly,
  EventEmotionMapItem,
  EventOpinionCluster,
  EventSentimentTrendDetailedPoint,
  EventUserRiskProfile,
  EventUserEmotionInsight,
  MediaTypeAnalysis,
  SpreadBreadthAnalysis,
  UserRelationNetwork
} from '@sker/sdk'
import { root } from '@sker/core'
import type { TabId, TabsDataManager } from '@/types/tab-loading';
import { createInitialTabsState } from '@/types/tab-loading';
import {
  createAnalysisWidgetState,
  resolveAnalysisWidgetState,
  type AnalysisWidgetState,
} from '@/types/analysis-widget';
import { getMetricExplanation } from '@/constants/metric-explanations';
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
  Shield,
  ThumbsUp,
  TrendingUp
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
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

import HotTopicsChart from '@/components/charts/HotTopicsChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import UserRelationGraph3DOffscreen from '@/components/charts/UserRelationGraph3DOffscreen';
import SentimentHotnessScatterChart from '@/components/charts/SentimentHotnessScatterChart';
import SentimentIntensityChart from '@/components/charts/SentimentIntensityChart';
import EngagementTrendChart from '@/components/charts/EngagementTrendChart';
import MultiMetricTrendChart from '@/components/charts/MultiMetricTrendChart';
import AnomalyTimelineChart from '@/components/charts/AnomalyTimelineChart';
import GeographicDistributionChart from '@/components/charts/GeographicDistributionChart';
// P2 组件导入
import { SpreadBreadthChart } from '@/components/charts/SpreadBreadthChart';
import MediaTypeDistribution from '@/components/charts/MediaTypeDistribution';
import { SentimentTransition } from '@/components/charts/SentimentTransition';
// P2 hooks 导入
// P3 组件导入
import { PropagationVelocityChart } from '@/components/charts/PropagationVelocityChart';
import InfluencePredictionCard from '@/components/charts/InfluencePredictionCard';
import { CommunityEvolutionTimeline } from '@/components/charts/CommunityEvolutionTimeline';
// P3 hooks 导入
// P1 组件导入
import UserEngagementFunnel from '@/components/charts/UserEngagementFunnel';
import { CommentThreadTree } from '@/components/charts/CommentThreadTree';
import PostingTimeHeatmap from '@/components/charts/PostingTimeHeatmap';
import { UserRelationWordCloud } from '@/components/charts/UserRelationWordCloud';
import { EventMilestoneWidget } from '@/components/charts/EventMilestoneWidget';
import { InstitutionParticipationPanel } from '@/components/charts/InstitutionParticipationPanel';
import { OpinionClusterPanel } from '@/components/charts/OpinionClusterPanel';
import { EmotionMapPanel } from '@/components/charts/EmotionMapPanel';
import { UserEmotionInsightPanel } from '@/components/charts/UserEmotionInsightPanel';
import { DetailedSentimentTrendPanel } from '@/components/charts/DetailedSentimentTrendPanel';
import { UserRiskProfilePanel } from '@/components/charts/UserRiskProfilePanel';
import { AbnormalUserPanel } from '@/components/charts/AbnormalUserPanel';
// P1 hooks 导入
import { AnalysisWidgetCard } from '@/components/ui';

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
  totalPosts?: number;
}

interface GeographicDataPoint {
  region: string;
  count: number;
  percentage: number;
  posts: number;
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

type TrendWidgets = {
  spreadBreadth: AnalysisWidgetState<SpreadBreadthAnalysis>;
  mediaType: AnalysisWidgetState<MediaTypeAnalysis>;
  anomalies: AnalysisWidgetState<EventAnomaly[]>;
};

type SentimentWidgets = {
  transition: AnalysisWidgetState<{ eventId: string }>;
  scatter: AnalysisWidgetState<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>;
  intensity: AnalysisWidgetState<Array<{ intensity: number; count: number }>>;
  emotionMap: AnalysisWidgetState<EventEmotionMapItem[]>;
  userInsights: AnalysisWidgetState<EventUserEmotionInsight[]>;
  detailedTrend: AnalysisWidgetState<EventSentimentTrendDetailedPoint[]>;
};

type OpinionWidgets = {
  clusters: AnalysisWidgetState<EventOpinionCluster[]>;
};

type UserAnalysisWidgets = {
  riskProfile: AnalysisWidgetState<EventUserRiskProfile>;
  abnormalUsers: AnalysisWidgetState<EventAbnormalUser[]>;
};

type OverviewWidgets = {
  milestones: AnalysisWidgetState<EventMilestone[]>;
  topicOverview: AnalysisWidgetState<EventTopicOverview>;
  institutions: AnalysisWidgetState<EventInstitutionAccount[]>;
};

interface EventMilestone {
  timestamp: string;
  type: 'heat_spike' | 'sentiment_turn' | 'propagation_peak' | 'official_response' | 'discussion_shift';
  title: string;
  summary: string;
  confidence: number;
  metrics: {
    hotness?: number;
    postCount?: number;
    userCount?: number;
    sentimentShift?: number;
  };
  representativePosts: Array<{
    postId: string;
    author: string;
    excerpt: string;
    engagement: number;
  }>;
}

interface EventInstitutionAccount {
  userId: string;
  screenName: string;
  avatar?: string;
  institutionType: 'government' | 'state_media' | 'enterprise_org' | 'official_other';
  verified: boolean;
  verifiedType?: string;
  postCount: number;
  interactionCount: number;
  influenceScore: number;
  sentimentTilt: 'positive' | 'negative' | 'neutral';
}

interface EventTopicOverview {
  topTopics: Array<{
    title: string;
    count: number;
    sentiment: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  timeSeries: Array<{
    keyword: string;
    timeData: Array<{
      timestamp: string;
      weight: number;
    }>;
  }>;
}

type EventsControllerPhase2 = {
  getEventMilestones: (id: string) => Promise<EventMilestone[]>;
  getEventTopicOverview: (id: string) => Promise<EventTopicOverview>;
  getEventInstitutions: (id: string) => Promise<EventInstitutionAccount[]>;
};

type EventsControllerPhase3 = {
  getEventOpinionClusters: (id: string) => Promise<EventOpinionCluster[]>;
  getEventEmotionMap: (id: string) => Promise<EventEmotionMapItem[]>;
  getEventUserEmotionInsights: (id: string) => Promise<EventUserEmotionInsight[]>;
  getEventSentimentTrendDetailed: (id: string) => Promise<EventSentimentTrendDetailedPoint[]>;
};

type EventsControllerPhase4 = {
  getEventRiskProfile: (id: string) => Promise<EventUserRiskProfile>;
  getEventAbnormalUsers: (id: string) => Promise<EventAbnormalUser[]>;
};

const logger = createLogger('EventDetail');

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendChartData | null>(null);
  const [userRelationNetwork, setUserRelationNetwork] = useState<UserRelationNetwork | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicDataPoint[]>([]);
  const [geographicStats, setGeographicStats] = useState<{ totalPosts?: number; totalUsers?: number; totalRegions?: number }>({});
  const [keywordData, setKeywordData] = useState<Array<{ keyword: string; weight: number; sentiment: 'positive' | 'negative' | 'neutral' }>>([]);
  const [engagementTrendData, setEngagementTrendData] = useState<Array<{ timestamp: string; post_count: number; comment_count: number; repost_count: number; like_count: number; user_count: number; hotness: number; engagement_rate: number; }>>([]);
  const [communityData, setCommunityData] = useState<any>(null);
  // P3 组件数据 state
  const [propagationVelocityData, setPropagationVelocityData] = useState<any>(null);
  const [influencePredictionData, setInfluencePredictionData] = useState<any>(null);
  const [communityEvolutionData, setCommunityEvolutionData] = useState<any>(null);
  // P1 组件数据 state
  const [userStratificationData, setUserStratificationData] = useState<any>(null);
  const [commentDepthData, setCommentDepthData] = useState<any>(null);
  const [postingTimeData, setPostingTimeData] = useState<any>(null);
  const [_networkCentralityData, setNetworkCentralityData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // Tab 懒加载状态管理
  const [tabsState, setTabsState] = useState<TabsDataManager>(createInitialTabsState());
  const [overviewWidgets, setOverviewWidgets] = useState<OverviewWidgets>({
    milestones: createAnalysisWidgetState(),
    topicOverview: createAnalysisWidgetState(),
    institutions: createAnalysisWidgetState(),
  });
  const [trendWidgets, setTrendWidgets] = useState<TrendWidgets>({
    spreadBreadth: createAnalysisWidgetState(),
    mediaType: createAnalysisWidgetState(),
    anomalies: createAnalysisWidgetState(),
  });
  const [opinionWidgets, setOpinionWidgets] = useState<OpinionWidgets>({
    clusters: createAnalysisWidgetState(),
  });
  const [userAnalysisWidgets, setUserAnalysisWidgets] = useState<UserAnalysisWidgets>({
    riskProfile: createAnalysisWidgetState(),
    abnormalUsers: createAnalysisWidgetState(),
  });
  const [sentimentWidgets, setSentimentWidgets] = useState<SentimentWidgets>({
    transition: createAnalysisWidgetState(),
    scatter: createAnalysisWidgetState(),
    intensity: createAnalysisWidgetState(),
    emotionMap: createAnalysisWidgetState(),
    userInsights: createAnalysisWidgetState(),
    detailedTrend: createAnalysisWidgetState(),
  });

  const fetchEventData = async (showRefresh = false) => {
    if (!eventId) {
      navigate('/event-analysis');
      return;
    }
    try {
      if (showRefresh) setIsRefreshing(true);
      const c = root.get(EventsController)

      // P0: 只加载基础数据和 overview Tab 数据
      const [eventData, timeSeriesData, trendData, keywordsData] = await Promise.all([
        c.getEventDetail(eventId),
        c.getEventTimeSeries(eventId),
        c.getEventTrends(eventId),
        c.getEventKeywords(eventId),
      ]);

      // 转换事件基础数据
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

      // 转换时间序列数据
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

      // 转换趋势数据
      setTrendData({
        hotnessData: trendData.hotnessData || [],
        sentimentData: trendData.sentimentScores || [],
        postData: trendData.postVolume || [],
        userData: trendData.userEngagement || [],
        totalPosts: trendData.totalPosts // 保存真实的总帖子数
      });

      // 转换关键词数据
      setKeywordData(keywordsData.map(item => ({
        keyword: item.keyword,
        weight: item.weight,
        sentiment: item.sentiment as 'positive' | 'negative' | 'neutral'
      })));

      // P0: overview Tab 的额外数据（可选）
      try {
        setEngagementTrendData(await c.getEngagementTrend(eventId) || []);
      } catch (e) {
        logger.warn('Failed to fetch engagement trend:', e);
      }

      await loadOverviewPhase2Widgets();

      // 标记 overview 为已加载
      setTabsState(prev => ({
        ...prev,
        overview: { loadingState: 'success', error: null, lastLoadedAt: Date.now() }
      }));

      // 如果当前 Tab 不是 overview，加载当前 Tab 数据
      if (activeTab !== 'overview') {
        await loadTabData(activeTab);
      }
    } catch (error) {
      logger.error('Failed to fetch event data:', error);
      setTabsState(prev => ({
        ...prev,
        overview: { loadingState: 'error', error: error as Error, lastLoadedAt: null }
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadOverviewPhase2Widgets = useCallback(async () => {
    if (!eventId) return;

    setOverviewWidgets({
      milestones: createAnalysisWidgetState({ status: 'loading' }),
      topicOverview: createAnalysisWidgetState({ status: 'loading' }),
      institutions: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase2;
    const settled = await Promise.allSettled([
      controller.getEventMilestones(eventId),
      controller.getEventTopicOverview(eventId),
      controller.getEventInstitutions(eventId),
    ]);

    setOverviewWidgets({
      milestones: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventMilestone[]>,
        (value) => value.length === 0,
      ),
      topicOverview: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<EventTopicOverview>,
        (value) => value.topTopics.length === 0,
      ),
      institutions: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<EventInstitutionAccount[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadTrendWidgets = useCallback(async () => {
    if (!eventId) return;

    setTrendWidgets({
      spreadBreadth: createAnalysisWidgetState({ status: 'loading' }),
      mediaType: createAnalysisWidgetState({ status: 'loading' }),
      anomalies: createAnalysisWidgetState({ status: 'loading' }),
    });

    const eventsController = root.get(EventsController);
    const spreadBreadthController = root.get(SpreadBreadthController);
    const mediaTypeController = root.get(MediaTypeController);

    const settled = await Promise.allSettled([
      spreadBreadthController.getAnalysis(eventId),
      mediaTypeController.getDistribution(eventId),
      eventsController.getAnomalies(eventId),
    ]);

    setTrendWidgets({
      spreadBreadth: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<SpreadBreadthAnalysis>,
        (value) => value.totalReposts === 0 && !value.propagationPaths?.length,
      ),
      mediaType: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<MediaTypeAnalysis>,
        (value) => value.distribution.length === 0,
      ),
      anomalies: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<EventAnomaly[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadOpinionWidgets = useCallback(async () => {
    if (!eventId) return;

    setOpinionWidgets({
      clusters: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase3;
    const settled = await Promise.allSettled([
      controller.getEventOpinionClusters(eventId),
    ]);

    setOpinionWidgets({
      clusters: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventOpinionCluster[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadUserAnalysisWidgets = useCallback(async () => {
    if (!eventId) return;

    setUserAnalysisWidgets({
      riskProfile: createAnalysisWidgetState({ status: 'loading' }),
      abnormalUsers: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase4;
    const settled = await Promise.allSettled([
      controller.getEventRiskProfile(eventId),
      controller.getEventAbnormalUsers(eventId),
    ]);

    setUserAnalysisWidgets({
      riskProfile: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventUserRiskProfile>,
        (value) => value.totalUsers === 0,
      ),
      abnormalUsers: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<EventAbnormalUser[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadSentimentWidgets = useCallback(async () => {
    if (!eventId) return;

    setSentimentWidgets({
      transition: createAnalysisWidgetState({ status: 'loading' }),
      scatter: createAnalysisWidgetState({ status: 'loading' }),
      intensity: createAnalysisWidgetState({ status: 'loading' }),
      emotionMap: createAnalysisWidgetState({ status: 'loading' }),
      userInsights: createAnalysisWidgetState({ status: 'loading' }),
      detailedTrend: createAnalysisWidgetState({ status: 'loading' }),
    });

    const eventsController = root.get(EventsController) as EventsController & EventsControllerPhase3;
    const settled = await Promise.allSettled([
      Promise.resolve({ eventId }),
      eventsController.getSentimentHotness(eventId),
      eventsController.getSentimentIntensity(eventId),
      eventsController.getEventEmotionMap(eventId),
      eventsController.getEventUserEmotionInsights(eventId),
      eventsController.getEventSentimentTrendDetailed(eventId),
    ]);

    setSentimentWidgets({
      transition: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<{ eventId: string }>,
        () => false,
      ),
      scatter: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>,
        (value) => value.length === 0,
      ),
      intensity: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<Array<{ intensity: number; count: number }>>,
        (value) => value.length === 0,
      ),
      emotionMap: resolveAnalysisWidgetState(
        settled[3] as PromiseSettledResult<EventEmotionMapItem[]>,
        (value) => value.length === 0,
      ),
      userInsights: resolveAnalysisWidgetState(
        settled[4] as PromiseSettledResult<EventUserEmotionInsight[]>,
        (value) => value.length === 0,
      ),
      detailedTrend: resolveAnalysisWidgetState(
        settled[5] as PromiseSettledResult<EventSentimentTrendDetailedPoint[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  // 按 Tab 加载数据
  const loadDataForTab = useCallback(async (tabId: TabId) => {
    if (!eventId) return;
    const c = root.get(EventsController);

    switch (tabId) {
      case 'overview':
        // overview 已在 fetchEventData 中加载
        break;

      case 'network':
        // 加载关系网络和社区发现数据
        await Promise.all([
          (async () => {
            if (!userRelationNetwork) {
              const data = await c.getEventUserRelations(eventId);
              setUserRelationNetwork(data);
            }
          })(),
          (async () => {
            if (!communityData) {
              const controller = root.get(CommunityDetectionController);
              const data = await controller.getAnalysis(eventId);
              setCommunityData(data);
            }
          })(),
        ]);
        break;

      case 'geographic':
        // 加载地理分布数据
        if (!geographicData.length) {
          const data = await c.getEventGeographic(eventId);
          
          // 保存后端附加的统计数据
          setGeographicStats({
            totalPosts: data.statistics.postCount,
            totalUsers: data.statistics.userCount,
            totalRegions: data.statistics.regionCount,
          });
          setGeographicData(data.distributions.map(item => ({
            region: item.region,
            count: item.count,
            percentage: item.percentage,
            posts: item.posts,
            sentiment: item.sentiment
          })));
        }
        break;

      case 'trend':
        await loadTrendWidgets();
        break;

      case 'opinions':
        await loadOpinionWidgets();
        break;

      case 'sentiment':
        await loadSentimentWidgets();
        break;

      case 'advanced':
        // 加载高级分析数据
        await Promise.all([
          (async () => {
            if (!propagationVelocityData) {
              const controller = root.get(PropagationVelocityController);
              const data = await controller.getVelocity(eventId);
              setPropagationVelocityData(data);
            }
          })(),
          (async () => {
            if (!influencePredictionData) {
              const controller = root.get(InfluencePredictionController);
              const data = await controller.getInfluencePrediction(eventId);
              setInfluencePredictionData(data);
            }
          })(),
          (async () => {
            if (!communityEvolutionData) {
              const controller = root.get(CommunityEvolutionController);
              const data = await controller.getAnalysis(eventId);
              setCommunityEvolutionData(data);
            }
          })(),
        ]);
        break;

      case 'user-analysis':
        // 加载用户分析数据
        await Promise.all([
          loadUserAnalysisWidgets(),
          (async () => {
            if (!userStratificationData) {
              const controller = root.get(UserStratificationController);
              const data = await controller.getStratification(eventId);
              setUserStratificationData(data);
            }
          })(),
          (async () => {
            if (!userRelationNetwork) {
              const controller = root.get(UserRelationController);
              const data = await controller.getNetwork(undefined, undefined, eventId);
              setUserRelationNetwork(data);
            }
          })(),
        ]);
        break;

      case 'content-analysis':
        // 加载内容分析数据
        await Promise.all([
          (async () => {
            if (!postingTimeData) {
              const controller = root.get(PostingTimeController);
              const data = await controller.getHeatmap(eventId);
              setPostingTimeData(data);
            }
          })(),
          (async () => {
            if (!commentDepthData) {
              const controller = root.get(CommentDepthController);
              const data = await controller.getAnalysis(eventId);
              setCommentDepthData(data);
            }
          })(),
        ]);
        break;
    }
  }, [eventId, userRelationNetwork, communityData, geographicData, loadTrendWidgets, loadOpinionWidgets, loadUserAnalysisWidgets, loadSentimentWidgets, propagationVelocityData, influencePredictionData, communityEvolutionData, userStratificationData, postingTimeData, commentDepthData]);

  // Tab 懒加载核心逻辑
  const loadTabData = useCallback(async (tabId: TabId, force = false) => {
    // 检查缓存
    if (!force && tabsState[tabId].loadingState === 'success') {
      return; // 已加载，跳过
    }

    // 检查是否正在加载
    if (tabsState[tabId].loadingState === 'loading') {
      return; // 正在加载，避免重复请求
    }

    // 更新为加载中
    setTabsState(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], loadingState: 'loading', error: null }
    }));

    try {
      // 根据 Tab ID 加载对应数据
      await loadDataForTab(tabId);

      // 更新为成功
      setTabsState(prev => ({
        ...prev,
        [tabId]: { loadingState: 'success', error: null, lastLoadedAt: Date.now() }
      }));
    } catch (error) {
      logger.error(`Failed to load tab data for ${tabId}:`, error);
      // 更新为失败
      setTabsState(prev => ({
        ...prev,
        [tabId]: { loadingState: 'error', error: error as Error, lastLoadedAt: null }
      }));
    }
  }, [tabsState, loadDataForTab]);

  // Tab 切换处理
  const handleTabChange = useCallback((newTab: string) => {
    const tabId = newTab as TabId;
    setActiveTab(tabId);
    loadTabData(tabId);
  }, [loadTabData]);

  useEffect(() => { fetchEventData(); }, [eventId]);

  const _openEditDialog = () => {
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

  const clearEventLocalCache = () => {
    try {
      const cacheKey = 'user_relation_network_cache';
      localStorage.removeItem(cacheKey);
      logger.info(`Local cache cleared: ${cacheKey}`);
    } catch (error) {
      // 静默处理 localStorage 错误（如隐私模式、配额超限等）
      logger.warn('Failed to clear local cache:', error);
    }
  };

  const handleRefreshCache = async () => {
    if (!eventId) return;
    setIsRefreshingCache(true);
    try {
      // 先清理本地 localStorage 缓存
      clearEventLocalCache();

      const c = root.get(EventsController);
      const result = await c.refreshCache(eventId);
      logger.info('Cache refreshed successfully', result);

      // 保存当前的 activeTab
      const currentTab = activeTab;

      // 清除所有数据状态
      setUserRelationNetwork(null);
      setGeographicData([]);
      setCommunityData(null);
      setOverviewWidgets({
        milestones: createAnalysisWidgetState(),
        topicOverview: createAnalysisWidgetState(),
        institutions: createAnalysisWidgetState(),
      });
      setTrendWidgets({
        spreadBreadth: createAnalysisWidgetState(),
        mediaType: createAnalysisWidgetState(),
        anomalies: createAnalysisWidgetState(),
      });
      setOpinionWidgets({
        clusters: createAnalysisWidgetState(),
      });
      setUserAnalysisWidgets({
        riskProfile: createAnalysisWidgetState(),
        abnormalUsers: createAnalysisWidgetState(),
      });
      setSentimentWidgets({
        transition: createAnalysisWidgetState(),
        scatter: createAnalysisWidgetState(),
        intensity: createAnalysisWidgetState(),
        emotionMap: createAnalysisWidgetState(),
        userInsights: createAnalysisWidgetState(),
        detailedTrend: createAnalysisWidgetState(),
      });
      setPropagationVelocityData(null);
      setInfluencePredictionData(null);
      setCommunityEvolutionData(null);
      setUserStratificationData(null);
      setCommentDepthData(null);
      setPostingTimeData(null);
      setNetworkCentralityData(null);

      // 清除所有 Tab 的加载状态
      setTabsState(createInitialTabsState());

      // 切换到 overview Tab，避免在当前 Tab 状态不一致时重新加载
      setActiveTab('overview');

      // 清除缓存后，重新加载基础数据
      await fetchEventData(true);

      // 如果之前不在 overview Tab，切换回去并重新加载该 Tab 数据
      if (currentTab !== 'overview') {
        setActiveTab(currentTab);
        // 使用 setTimeout 确保状态更新完成后再加载 Tab 数据
        setTimeout(() => {
          loadTabData(currentTab, true);
        }, 0);
      }
    } catch (error) {
      logger.error('Failed to refresh cache:', error);
    } finally {
      setIsRefreshingCache(false);
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCache}
            disabled={isRefreshingCache}
            className="gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingCache && "animate-spin")} />
            {isRefreshingCache ? '清除中...' : '更新缓存'}
          </Button>
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
      </div>

      {/* 事件信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-muted/20 border border-border/40"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-transparent pointer-events-none" />
        <div
          className="relative p-5"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
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
                    setEditDialogOpen(open);
                  }}
                  modal={true}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-lg"
                    onPointerDownOutside={(e) => {
                      e.preventDefault();
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
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleKeyDown}
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

      {/* Tab 导航 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-9 bg-muted/20 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">总览</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="data-[state=active]:bg-primary/20 gap-2">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">关系网络</span>
            {tabsState.network.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="geographic" className="data-[state=active]:bg-primary/20 gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">地理分布</span>
            {tabsState.geographic.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-primary/20 gap-2">
            <LineChart className="w-4 h-4" />
            <span className="hidden sm:inline">趋势分析</span>
            {tabsState.trend.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="opinions" className="data-[state=active]:bg-primary/20 gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">观点汇集</span>
            {tabsState.opinions.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="data-[state=active]:bg-primary/20 gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">情感分析</span>
            {tabsState.sentiment.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20 gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">高级分析</span>
            {tabsState.advanced.loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="user-analysis" className="data-[state=active]:bg-primary/20 gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">用户分析</span>
            {tabsState['user-analysis'].loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="content-analysis" className="data-[state=active]:bg-primary/20 gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">内容分析</span>
            {tabsState['content-analysis'].loadingState === 'loading' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* 总览 Tab */}
        <TabsContent value="overview" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
                value={stats?.avgHotness ?? Number(eventData.hotness)}
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
              <div>
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
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalysisWidgetCard
                title="事件里程碑"
                icon={<Clock className="h-4 w-4" />}
                state={overviewWidgets.milestones}
                emptyText="暂无里程碑数据"
                onRetry={loadOverviewPhase2Widgets}
              >
                <EventMilestoneWidget data={overviewWidgets.milestones.data ?? []} />
              </AnalysisWidgetCard>

              <AnalysisWidgetCard
                title="高频话题分布"
                icon={<Sprout className="h-4 w-4" />}
                state={overviewWidgets.topicOverview}
                emptyText="暂无话题分布数据"
                onRetry={loadOverviewPhase2Widgets}
              >
                <HotTopicsChart
                  title=""
                  data={(overviewWidgets.topicOverview.data?.topTopics ?? []).map((item, index) => ({
                    id: `${item.title}-${index}`,
                    createdAt: '',
                    updatedAt: '',
                    title: item.title,
                    count: item.count,
                    sentiment: item.sentiment as 'positive' | 'negative' | 'neutral',
                    keywords: [],
                    trend: item.trend,
                    trendValue: 0,
                  }))}
                  maxTopics={8}
                />
              </AnalysisWidgetCard>
            </div>

            <AnalysisWidgetCard
              title="机构账号参与"
              icon={<Users className="h-4 w-4" />}
              state={overviewWidgets.institutions}
              emptyText="暂无机构参与数据"
              onRetry={loadOverviewPhase2Widgets}
            >
              <InstitutionParticipationPanel data={overviewWidgets.institutions.data ?? []} />
            </AnalysisWidgetCard>

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
                <WordCloudChart title="" height={280} maxWords={1000} data={keywordData} />
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
          {tabsState.network.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载关系网络数据中...</p>
              </div>
            </div>
          ) : tabsState.network.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('network', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
          )}
        </TabsContent>

        {/* 地理分布 Tab */}
        <TabsContent value="geographic" className="mt-6">
          {tabsState.geographic.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载地理分布数据中...</p>
              </div>
            </div>
          ) : tabsState.geographic.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('geographic', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  地理分布分析
                </h3>
                <GeographicDistributionChart
                  data={geographicData}
                  totalPosts={geographicStats.totalPosts ?? stats?.totalPosts ?? eventData.postCount}
                  totalUsers={geographicStats.totalUsers}
                  totalRegions={geographicStats.totalRegions}
                  height={400}
                  showTable={true}
                  maxItems={20}
                />
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* 趋势分析 Tab */}
        <TabsContent value="trend" className="mt-6">
          {tabsState.trend.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载趋势分析数据中...</p>
              </div>
            </div>
          ) : tabsState.trend.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('trend', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <AnalysisWidgetCard
                title="传播广度分析"
                icon={<Activity className="h-4 w-4" />}
                explanation={getMetricExplanation('spread-breadth')}
                state={trendWidgets.spreadBreadth}
                emptyText="暂无传播广度数据"
                onRetry={loadTrendWidgets}
              >
                <SpreadBreadthChart data={trendWidgets.spreadBreadth.data} height={500} />
              </AnalysisWidgetCard>
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  核心指标时间趋势
                </h3>
                <MultiMetricTrendChart data={engagementTrendData} height={380} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalysisWidgetCard
                  title="媒体类型分布"
                  icon={<BarChart3 className="h-4 w-4" />}
                  state={trendWidgets.mediaType}
                  emptyText="暂无媒体类型数据"
                  onRetry={loadTrendWidgets}
                >
                  <MediaTypeDistribution data={trendWidgets.mediaType.data} height={350} />
                </AnalysisWidgetCard>
                <AnalysisWidgetCard
                  title="异常检测时间线"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  explanation={getMetricExplanation('anomaly-timeline')}
                  state={trendWidgets.anomalies}
                  emptyText="暂无异常检测数据"
                  onRetry={loadTrendWidgets}
                >
                  <AnomalyTimelineChart data={trendWidgets.anomalies.data ?? []} height={350} />
                </AnalysisWidgetCard>
              </div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="opinions" className="mt-6">
          {tabsState.opinions.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载观点汇集数据中...</p>
              </div>
            </div>
          ) : tabsState.opinions.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('opinions', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <AnalysisWidgetCard
                title="观点簇概览"
                icon={<MessageSquare className="h-4 w-4" />}
                state={opinionWidgets.clusters}
                emptyText="暂无观点簇数据"
                onRetry={loadOpinionWidgets}
              >
                <OpinionClusterPanel data={opinionWidgets.clusters.data ?? []} />
              </AnalysisWidgetCard>
            </motion.div>
          )}
        </TabsContent>

        {/* 情感分析 Tab */}
        <TabsContent value="sentiment" className="mt-6">
          {tabsState.sentiment.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载情感分析数据中...</p>
              </div>
            </div>
          ) : tabsState.sentiment.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('sentiment', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <AnalysisWidgetCard
                title="情感转变追踪"
                icon={<Heart className="h-4 w-4" />}
                explanation={getMetricExplanation('sentiment-transition')}
                state={sentimentWidgets.transition}
                emptyText="暂无情感转变数据"
                onRetry={loadSentimentWidgets}
              >
                {eventId && <SentimentTransition eventId={eventId} />}
              </AnalysisWidgetCard>
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  情感变化趋势
                </h3>
                <TimeSeriesChart data={timeSeriesData} title="" height={320} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalysisWidgetCard
                  title="情感-热度关联"
                  icon={<Target className="h-4 w-4" />}
                  state={sentimentWidgets.scatter}
                  emptyText="暂无情感热度数据"
                  onRetry={loadSentimentWidgets}
                >
                  <SentimentHotnessScatterChart title="" height={350} data={sentimentWidgets.scatter.data ?? []} />
                </AnalysisWidgetCard>
                <AnalysisWidgetCard
                  title="情感强度谱"
                  icon={<Zap className="h-4 w-4" />}
                  state={sentimentWidgets.intensity}
                  emptyText="暂无情感强度数据"
                  onRetry={loadSentimentWidgets}
                >
                  <SentimentIntensityChart title="" height={350} data={sentimentWidgets.intensity.data ?? []} />
                </AnalysisWidgetCard>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalysisWidgetCard
                  title="情绪地图"
                  icon={<Sprout className="h-4 w-4" />}
                  state={sentimentWidgets.emotionMap}
                  emptyText="暂无情绪地图数据"
                  onRetry={loadSentimentWidgets}
                >
                  <EmotionMapPanel data={sentimentWidgets.emotionMap.data ?? []} />
                </AnalysisWidgetCard>
                <AnalysisWidgetCard
                  title="用户情绪洞察"
                  icon={<Users className="h-4 w-4" />}
                  state={sentimentWidgets.userInsights}
                  emptyText="暂无用户情绪洞察"
                  onRetry={loadSentimentWidgets}
                >
                  <UserEmotionInsightPanel data={sentimentWidgets.userInsights.data ?? []} />
                </AnalysisWidgetCard>
              </div>
              <AnalysisWidgetCard
                title="详细情感趋势"
                icon={<TrendingUp className="h-4 w-4" />}
                state={sentimentWidgets.detailedTrend}
                emptyText="暂无详细情感趋势数据"
                onRetry={loadSentimentWidgets}
              >
                <DetailedSentimentTrendPanel data={sentimentWidgets.detailedTrend.data ?? []} />
              </AnalysisWidgetCard>
            </motion.div>
          )}
        </TabsContent>

        {/* 高级分析 Tab */}
        <TabsContent value="advanced" className="mt-6">
          {tabsState.advanced.loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载高级分析数据中...</p>
              </div>
            </div>
          ) : tabsState.advanced.loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('advanced', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* P3: 传播速度分析 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  传播速度分析
                </h3>
                <PropagationVelocityChart
                  data={propagationVelocityData}
                  isLoading={!propagationVelocityData}
                  height={400}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* P3: 影响力预测 */}
                <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    影响力预测
                  </h3>
                  <InfluencePredictionCard
                    data={influencePredictionData}
                    isLoading={!influencePredictionData}
                  />
                </div>

                {/* P3: 社区演化追踪 */}
                <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    社区演化追踪
                  </h3>
                  <CommunityEvolutionTimeline
                    data={communityEvolutionData}
                    isLoading={!communityEvolutionData}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* 用户分析 Tab */}
        <TabsContent value="user-analysis" className="mt-6">
          {tabsState['user-analysis'].loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载用户分析数据中...</p>
              </div>
            </div>
          ) : tabsState['user-analysis'].loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('user-analysis', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <AnalysisWidgetCard
                title="用户风险画像"
                icon={<Shield className="h-4 w-4" />}
                state={userAnalysisWidgets.riskProfile}
                emptyText="暂无用户风险画像"
                onRetry={loadUserAnalysisWidgets}
              >
                {userAnalysisWidgets.riskProfile.data ? (
                  <UserRiskProfilePanel data={userAnalysisWidgets.riskProfile.data} />
                ) : null}
              </AnalysisWidgetCard>

              <AnalysisWidgetCard
                title="异常用户面板"
                icon={<AlertTriangle className="h-4 w-4" />}
                state={userAnalysisWidgets.abnormalUsers}
                emptyText="暂无异常用户"
                onRetry={loadUserAnalysisWidgets}
              >
                <AbnormalUserPanel data={userAnalysisWidgets.abnormalUsers.data ?? []} />
              </AnalysisWidgetCard>

              {/* P1: 用户参与度分层 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  用户参与度分层
                </h3>
                <UserEngagementFunnel
                  data={userStratificationData}
                  isLoading={!userStratificationData}
                  height={400}
                />
              </div>

              {/* 用户关系词云 */}
              <UserRelationWordCloud
                network={userRelationNetwork}
                isLoading={!userRelationNetwork}
                height={400}
                maxWords={1000}
              />
            </motion.div>
          )}
        </TabsContent>

        {/* 内容分析 Tab */}
        <TabsContent value="content-analysis" className="mt-6">
          {tabsState['content-analysis'].loadingState === 'loading' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">加载内容分析数据中...</p>
              </div>
            </div>
          ) : tabsState['content-analysis'].loadingState === 'error' ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">加载失败</p>
                <Button onClick={() => loadTabData('content-analysis', true)}>重试</Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* P1: 发帖时间热力图 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  发帖时间热力图
                </h3>
                <PostingTimeHeatmap
                  data={postingTimeData}
                  isLoading={!postingTimeData}
                  height={400}
                />
              </div>

              {/* P1: 评论深度分析 */}
              <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  评论深度分析
                </h3>
                <CommentThreadTree
                  data={commentDepthData}
                  isLoading={!commentDepthData}
                  height={400}
                />
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDetail;
