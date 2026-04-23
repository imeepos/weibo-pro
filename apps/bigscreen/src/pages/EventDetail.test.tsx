import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { root } from '@sker/core';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => {
      const location = actual.useLocation();
      const eventMatch = /\/event\/([^/]+)/.exec(location.pathname);
      const eventAnalysisMatch = /\/event-analysis\/([^/]+)/.exec(location.pathname);
      const eventId = eventMatch?.[1] || eventAnalysisMatch?.[1];
      return eventId ? { eventId } : {};
    },
  };
});

vi.mock('@sker/core', async () => {
  const actual = await vi.importActual<typeof import('@sker/core')>('@sker/core');
  return {
    ...actual,
    root: {
      get: vi.fn(),
    },
  };
});

vi.mock('@sker/sdk', () => ({
  EventsController: class EventsController {},
  SpreadBreadthController: class SpreadBreadthController {},
  MediaTypeController: class MediaTypeController {},
  CommunityDetectionController: class CommunityDetectionController {},
  PropagationVelocityController: class PropagationVelocityController {},
  InfluencePredictionController: class InfluencePredictionController {},
  CommunityEvolutionController: class CommunityEvolutionController {},
  UserStratificationController: class UserStratificationController {},
  CommentDepthController: class CommentDepthController {},
  PostingTimeController: class PostingTimeController {},
  NetworkCentralityController: class NetworkCentralityController {},
  UserRelationController: class UserRelationController {},
}));

vi.mock('@/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatNumber: (num: number) => num.toLocaleString(),
  formatRelativeTime: () => '2小时前',
}));

vi.mock('@/components/charts/TimeSeriesChart', () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="time-series-chart">TimeSeriesChart ({data.length})</div>
  ),
}));

vi.mock('@/components/charts/WordCloudChart', () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="word-cloud-chart">WordCloudChart ({data.length})</div>
  ),
}));

vi.mock('@/components/charts/HotTopicsChart', () => ({
  default: ({ data }: { data: Array<{ title: string }> }) => (
    <div data-testid="hot-topics-chart">
      {data.map((item) => item.title).join(',')}
    </div>
  ),
}));

vi.mock('@/components/charts/EventMilestoneWidget', () => ({
  EventMilestoneWidget: ({ data }: { data: Array<{ title: string }> }) => (
    <div data-testid="event-milestone-widget">
      {data.map((item) => item.title).join(',')}
    </div>
  ),
}));

vi.mock('@/components/charts/InstitutionParticipationPanel', () => ({
  InstitutionParticipationPanel: ({ data }: { data: Array<{ screenName: string }> }) => (
    <div data-testid="institution-participation-panel">
      {data.map((item) => item.screenName).join(',')}
    </div>
  ),
}));

vi.mock('@/components/charts/UserRelationGraph3DOffscreen', () => ({
  default: () => <div data-testid="user-relation-graph">UserRelationGraph3DOffscreen</div>,
}));

vi.mock('@/components/charts/SentimentHotnessScatterChart', () => ({
  default: () => <div data-testid="sentiment-hotness-chart">SentimentHotnessScatterChart</div>,
}));

vi.mock('@/components/charts/SentimentIntensityChart', () => ({
  default: () => <div data-testid="sentiment-intensity-chart">SentimentIntensityChart</div>,
}));

vi.mock('@/components/charts/EngagementTrendChart', () => ({
  default: () => <div data-testid="engagement-trend-chart">EngagementTrendChart</div>,
}));

vi.mock('@/components/charts/MultiMetricTrendChart', () => ({
  default: () => <div data-testid="multi-metric-trend-chart">MultiMetricTrendChart</div>,
}));

vi.mock('@/components/charts/AnomalyTimelineChart', () => ({
  default: () => <div data-testid="anomaly-timeline-chart">AnomalyTimelineChart</div>,
}));

vi.mock('@/components/charts/SpreadBreadthChart', () => ({
  SpreadBreadthChart: ({ data }: { data: unknown }) => (
    <div data-testid="spread-breadth-chart">
      SpreadBreadthChart {data ? 'with data' : 'no data'}
    </div>
  ),
}));

vi.mock('@/components/charts/MediaTypeDistribution', () => ({
  default: ({ data }: { data: unknown }) => (
    <div data-testid="media-type-distribution">
      MediaTypeDistribution {data ? 'with data' : 'no data'}
    </div>
  ),
}));

vi.mock('@/components/charts/CommunityGraph', () => ({
  default: () => <div data-testid="community-graph">CommunityGraph</div>,
}));

vi.mock('@/components/charts/SentimentTransition', () => ({
  SentimentTransition: ({ eventId }: { eventId: string }) => (
    <div data-testid="sentiment-transition">SentimentTransition {eventId}</div>
  ),
}));

vi.mock('@/components/charts/PropagationVelocityChart', () => ({
  PropagationVelocityChart: () => <div data-testid="propagation-velocity-chart">PropagationVelocityChart</div>,
}));

vi.mock('@/components/charts/InfluencePredictionCard', () => ({
  default: () => <div data-testid="influence-prediction-card">InfluencePredictionCard</div>,
}));

vi.mock('@/components/charts/CommunityEvolutionTimeline', () => ({
  CommunityEvolutionTimeline: () => <div data-testid="community-evolution-timeline">CommunityEvolutionTimeline</div>,
}));

vi.mock('@/components/charts/UserEngagementFunnel', () => ({
  default: () => <div data-testid="user-engagement-funnel">UserEngagementFunnel</div>,
}));

vi.mock('@/components/charts/CommentThreadTree', () => ({
  CommentThreadTree: () => <div data-testid="comment-thread-tree">CommentThreadTree</div>,
}));

vi.mock('@/components/charts/PostingTimeHeatmap', () => ({
  default: () => <div data-testid="posting-time-heatmap">PostingTimeHeatmap</div>,
}));

vi.mock('@/components/charts/UserRelationWordCloud', () => ({
  UserRelationWordCloud: () => <div data-testid="user-relation-wordcloud">UserRelationWordCloud</div>,
}));

vi.mock('@/components/charts/GeographicDistributionChart', () => ({
  default: () => <div data-testid="geographic-distribution-chart">GeographicDistributionChart</div>,
}));

vi.mock('@sker/ui/components/ui/metric-card', () => ({
  MetricCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid={`metric-${title}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@sker/ui/components/ui/tabs', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  const TabsContext = ReactModule.createContext<{
    value: string;
    onValueChange: (value: string) => void;
  } | null>(null);

  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: React.PropsWithChildren<{ value: string; onValueChange: (value: string) => void }>) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    TabsTrigger: ({
      value,
      children,
      className,
    }: React.PropsWithChildren<{ value: string; className?: string }>) => {
      const context = ReactModule.useContext(TabsContext);
      return (
        <button
          role="tab"
          aria-selected={context?.value === value}
          className={className}
          onClick={() => context?.onValueChange(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({
      value,
      children,
      className,
    }: React.PropsWithChildren<{ value: string; className?: string }>) => {
      const context = ReactModule.useContext(TabsContext);
      if (context?.value !== value) return null;
      return <div className={className}>{children}</div>;
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren) => <div {...props}>{children}</div>,
  },
}));

import { EventsController } from '@sker/sdk';
import EventDetail from './EventDetail';

describe('EventDetail', () => {
  const mockEventId = 'test-event-123';
  const mockEventData = {
    id: mockEventId,
    title: '测试事件标题',
    description: '这是一个测试事件的描述信息',
    postCount: 1500,
    userCount: 800,
    sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
    hotness: 95,
    trend: 'up' as const,
    category: '科技',
    keywords: ['AI', '人工智能', '机器学习'],
    createdAt: '2025-01-01T00:00:00Z',
    lastUpdate: '2025-01-15T12:00:00Z',
    timeline: [],
    propagationPath: [],
    keyNodes: [],
  };

  const mockEventsController = {
    getEventDetail: vi.fn(),
    getEventTimeSeries: vi.fn(),
    getEventTrends: vi.fn(),
    getEventKeywords: vi.fn(),
    getEventMilestones: vi.fn(),
    getEventTopicOverview: vi.fn(),
    getEventInstitutions: vi.fn(),
    getEngagementTrend: vi.fn(),
    getEventUserRelations: vi.fn(),
    getEventGeographic: vi.fn(),
    getSentimentHotness: vi.fn(),
    getSentimentIntensity: vi.fn(),
    getAnomalies: vi.fn(),
    refreshCache: vi.fn(),
    updateEventKeywords: vi.fn(),
  };

  const mockSpreadBreadthController = {
    getAnalysis: vi.fn(),
  };

  const mockMediaTypeController = {
    getDistribution: vi.fn(),
  };

  const renderEventDetail = () =>
    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventsController.getEventDetail.mockResolvedValue(mockEventData);
    mockEventsController.getEventTimeSeries.mockResolvedValue({
      categories: ['2025-01-15T00:00:00Z'],
      series: [
        { name: '帖子数量', data: [100] },
        { name: '正面情绪', data: [0.6] },
        { name: '负面情绪', data: [0.2] },
        { name: '中性情绪', data: [0.2] },
      ],
    });
    mockEventsController.getEventTrends.mockResolvedValue({
      hotnessData: [80, 85, 90, 95],
      sentimentScores: [0.5, 0.55, 0.6, 0.65],
      postVolume: [100, 120, 150, 180],
      userEngagement: [50, 60, 75, 90],
      totalPosts: 550,
    });
    mockEventsController.getEventKeywords.mockResolvedValue([
      { keyword: 'AI', weight: 0.9, sentiment: 'positive' },
      { keyword: '人工智能', weight: 0.8, sentiment: 'positive' },
    ]);
    mockEventsController.getEventMilestones.mockResolvedValue([
      {
        timestamp: '2026-04-20T09:00:00.000Z',
        type: 'heat_spike',
        title: '热度峰值',
        summary: '热度在该时间窗快速升高',
        confidence: 0.8,
        metrics: { hotness: 120, postCount: 60, userCount: 40 },
        representativePosts: [],
      },
    ]);
    mockEventsController.getEventTopicOverview.mockResolvedValue({
      topTopics: [
        { title: '外交部', count: 42, sentiment: 'neutral', trend: 'stable' },
      ],
      timeSeries: [],
    });
    mockEventsController.getEventInstitutions.mockResolvedValue([
      {
        userId: 'user-1',
        screenName: '新华社',
        institutionType: 'state_media',
        verified: true,
        postCount: 5,
        interactionCount: 120,
        influenceScore: 9800,
        sentimentTilt: 'neutral',
      },
    ]);
    mockEventsController.getEngagementTrend.mockResolvedValue([]);
    mockEventsController.getEventUserRelations.mockResolvedValue({
      nodes: [{ id: '1', name: '用户1' }],
      edges: [],
      statistics: {
        totalUsers: 1,
        totalRelations: 0,
        avgDegree: 0,
        density: 0,
        communities: 0,
      },
    });
    mockEventsController.getEventGeographic.mockResolvedValue({
      statistics: { postCount: 100, userCount: 20, regionCount: 2, avgSentiment: 0.6 },
      distributions: [],
    });
    mockEventsController.getSentimentHotness.mockResolvedValue([
      { postId: '1', sentimentScore: 0.8, hotness: 90, timestamp: '2025-01-15T00:00:00Z' },
    ]);
    mockEventsController.getSentimentIntensity.mockResolvedValue([
      { intensity: 0.8, count: 100 },
    ]);
    mockEventsController.getAnomalies.mockResolvedValue([
      {
        timestamp: '2025-01-15T00:00:00Z',
        type: 'spike',
        metric: 'hotness',
        value: 100,
        expected: 70,
        confidence: 0.9,
      },
    ]);
    mockEventsController.refreshCache.mockResolvedValue({ success: true });
    mockEventsController.updateEventKeywords.mockResolvedValue({ success: true });

    mockSpreadBreadthController.getAnalysis.mockResolvedValue({
      totalReposts: 100,
      uniqueReposters: 80,
      spreadDepth: 5,
      spreadWidth: 4.5,
      breadthIndex: 0.75,
      propagationPaths: [],
      spreadTimeline: [],
      repostByUserType: [],
    });

    mockMediaTypeController.getDistribution.mockResolvedValue({
      totalPosts: 1000,
      distribution: [],
      trend: [],
      engagementByType: [],
    });

    vi.mocked(root.get).mockImplementation((token: any) => {
      if (token === EventsController) {
        return mockEventsController as any;
      }
      if (token.name === 'SpreadBreadthController') {
        return mockSpreadBreadthController as any;
      }
      if (token.name === 'MediaTypeController') {
        return mockMediaTypeController as any;
      }
      if (token.name === 'CommunityDetectionController') {
        return { getAnalysis: vi.fn().mockResolvedValue({ communities: [] }) } as any;
      }
      if (token.name === 'PropagationVelocityController') {
        return { getVelocity: vi.fn().mockResolvedValue({ velocityScore: 0.8 }) } as any;
      }
      if (token.name === 'InfluencePredictionController') {
        return { getInfluencePrediction: vi.fn().mockResolvedValue({ predictedReach: 10000 }) } as any;
      }
      if (token.name === 'CommunityEvolutionController') {
        return { getAnalysis: vi.fn().mockResolvedValue({ timeSlices: [] }) } as any;
      }
      if (token.name === 'UserStratificationController') {
        return { getStratification: vi.fn().mockResolvedValue({ layers: [], engagementGini: 0, totalUsers: 0, summary: { coreRatio: 0, activeRatio: 0, paretoIndex: 0 } }) } as any;
      }
      if (token.name === 'CommentDepthController') {
        return { getAnalysis: vi.fn().mockResolvedValue({}) } as any;
      }
      if (token.name === 'PostingTimeController') {
        return { getHeatmap: vi.fn().mockResolvedValue({}) } as any;
      }
      if (token.name === 'NetworkCentralityController') {
        return { getAnalysis: vi.fn().mockResolvedValue({ nodes: [] }) } as any;
      }
      if (token.name === 'UserRelationController') {
        return { getNetwork: vi.fn().mockResolvedValue({ nodes: [], edges: [], statistics: { totalUsers: 0, totalRelations: 0, avgDegree: 0, density: 0 } }) } as any;
      }
      return {} as any;
    });
  });

  it('在基础数据未返回前显示骨架屏', () => {
    mockEventsController.getEventDetail.mockReturnValue(new Promise(() => {}));

    renderEventDetail();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('加载后渲染当前页头和事件信息卡片', async () => {
    renderEventDetail();

    expect(await screen.findByText('测试事件标题')).toBeInTheDocument();
    expect(screen.getByText('事件详情')).toBeInTheDocument();
    expect(screen.getByText('科技')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '更新缓存' })).toBeInTheDocument();
    expect(screen.getByText('#AI')).toBeInTheDocument();
  });

  it('初始化时只加载基础数据和 overview 依赖', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    expect(mockEventsController.getEventDetail).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventTimeSeries).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventTrends).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventKeywords).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEngagementTrend).toHaveBeenCalledWith(mockEventId);

    expect(mockEventsController.getEventUserRelations).not.toHaveBeenCalled();
    expect(mockEventsController.getEventGeographic).not.toHaveBeenCalled();
    expect(mockEventsController.getSentimentHotness).not.toHaveBeenCalled();
    expect(mockEventsController.getSentimentIntensity).not.toHaveBeenCalled();
    expect(mockEventsController.getAnomalies).not.toHaveBeenCalled();
  });

  it('切换到关系网络 tab 时才加载网络数据', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /关系网络/ }));

    await waitFor(() => {
      expect(mockEventsController.getEventUserRelations).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('用户关系网络')).toBeInTheDocument();
  });

  it('切换到趋势和情感 tab 时才加载对应模块', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /趋势分析/ }));

    await waitFor(() => {
      expect(mockSpreadBreadthController.getAnalysis).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getAnomalies).toHaveBeenCalledWith(mockEventId);
    });

    expect(screen.getByText('传播广度分析')).toBeInTheDocument();
    expect(screen.getByText('媒体类型分布')).toBeInTheDocument();
    expect(screen.getByText('异常检测时间线')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /情感分析/ }));
    expect(await screen.findByTestId('sentiment-transition')).toBeInTheDocument();
    expect(screen.getByTestId('sentiment-hotness-chart')).toBeInTheDocument();
    expect(screen.getByTestId('sentiment-intensity-chart')).toBeInTheDocument();
    expect(mockEventsController.getSentimentHotness).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getSentimentIntensity).toHaveBeenCalledWith(mockEventId);
  });

  it('点击更新缓存时调用 refreshCache 并刷新基础数据', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('button', { name: '更新缓存' }));

    await waitFor(() => {
      expect(mockEventsController.refreshCache).toHaveBeenCalledWith(mockEventId);
    });
  });

  it('renders milestones, topic summary, and institution participation in overview', async () => {
    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    expect(await screen.findByText('事件里程碑')).toBeInTheDocument();
    expect(screen.getByText('高频话题分布')).toBeInTheDocument();
    expect(screen.getByText('机构账号参与')).toBeInTheDocument();
    expect(screen.getByTestId('event-milestone-widget')).toHaveTextContent('热度峰值');
    expect(screen.getByTestId('hot-topics-chart')).toHaveTextContent('外交部');
    expect(screen.getByTestId('institution-participation-panel')).toHaveTextContent('新华社');
  });

  it('keeps successful trend widgets visible when one trend request fails', async () => {
    const spreadController = {
      getAnalysis: vi.fn().mockResolvedValue({
        totalReposts: 100,
        uniqueReposters: 80,
        spreadDepth: 5,
        spreadWidth: 4.5,
        breadthIndex: 0.75,
        propagationPaths: [],
        spreadTimeline: [],
        repostByUserType: [],
      }),
    };

    const mediaController = {
      getDistribution: vi.fn().mockRejectedValue(new Error('media failed')),
    };

    vi.mocked(root.get).mockImplementation((token: any) => {
      if (token === EventsController) return mockEventsController as any;
      if (token.name === 'SpreadBreadthController') return spreadController as any;
      if (token.name === 'MediaTypeController') return mediaController as any;
      if (token.name === 'CommunityDetectionController') {
        return { getAnalysis: vi.fn().mockResolvedValue({ communities: [] }) } as any;
      }
      return {} as any;
    });

    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));

    expect(await screen.findByTestId('spread-breadth-chart')).toBeInTheDocument();
    expect(await screen.findByText('media failed')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '重试媒体类型分布' }),
    ).toBeInTheDocument();
  });

  it('renders metric explanation triggers for trend and sentiment widgets', async () => {
    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));
    expect(
      await screen.findByRole('button', { name: '传播广度分析指标说明' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '情感分析' }));
    expect(
      await screen.findByRole('button', { name: '情感转变追踪指标说明' }),
    ).toBeInTheDocument();
  });
});
