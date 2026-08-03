/**
 * EventDetail 测试共享辅助文件。
 * 从拆分前的 EventDetail.test.tsx 中抽取,集中管理:
 *  - 全部 vi.mock 块(组件/依赖 mock)
 *  - controller mock 实例
 *  - renderEventDetail 渲染辅助
 *  - setupDefaultMocks 默认 mock 设置(beforeEach 调用)
 *
 * 注意:测试文件必须将该模块作为第一个 import,确保 mock 先于被测模块注册。
 */
import { vi, type Mock } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
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
import * as fixtures from './__fixtures__/eventDetailFixtures';

export const mockEventId = fixtures.mockEventId;

export const mockEventsController: {
  getEventDetail: Mock;
  getEventTimeSeries: Mock;
  getEventTrends: Mock;
  getEventKeywords: Mock;
  getEventMilestones: Mock;
  getEventTopicOverview: Mock;
  getEventInstitutions: Mock;
  getEventOpinionClusters: Mock;
  getEventEmotionMap: Mock;
  getEventUserEmotionInsights: Mock;
  getEventSentimentTrendDetailed: Mock;
  getEventRiskProfile: Mock;
  getEventAbnormalUsers: Mock;
  getEngagementTrend: Mock;
  getEventUserRelations: Mock;
  getEventGeographic: Mock;
  getSentimentHotness: Mock;
  getSentimentIntensity: Mock;
  getAnomalies: Mock;
  refreshCache: Mock;
  updateEventKeywords: Mock;
} = {
  getEventDetail: vi.fn(),
  getEventTimeSeries: vi.fn(),
  getEventTrends: vi.fn(),
  getEventKeywords: vi.fn(),
  getEventMilestones: vi.fn(),
  getEventTopicOverview: vi.fn(),
  getEventInstitutions: vi.fn(),
  getEventOpinionClusters: vi.fn(),
  getEventEmotionMap: vi.fn(),
  getEventUserEmotionInsights: vi.fn(),
  getEventSentimentTrendDetailed: vi.fn(),
  getEventRiskProfile: vi.fn(),
  getEventAbnormalUsers: vi.fn(),
  getEngagementTrend: vi.fn(),
  getEventUserRelations: vi.fn(),
  getEventGeographic: vi.fn(),
  getSentimentHotness: vi.fn(),
  getSentimentIntensity: vi.fn(),
  getAnomalies: vi.fn(),
  refreshCache: vi.fn(),
  updateEventKeywords: vi.fn(),
};

export const mockSpreadBreadthController: {
  getAnalysis: Mock;
} = {
  getAnalysis: vi.fn(),
};

export const mockMediaTypeController: {
  getDistribution: Mock;
} = {
  getDistribution: vi.fn(),
};

export const renderEventDetail: () => RenderResult = () =>
  render(
    <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
      <EventDetail />
    </MemoryRouter>,
  );

export const setupDefaultMocks = () => {
  vi.clearAllMocks();

  mockEventsController.getEventDetail.mockResolvedValue(fixtures.mockEventData);
  mockEventsController.getEventTimeSeries.mockResolvedValue(fixtures.eventTimeSeries);
  mockEventsController.getEventTrends.mockResolvedValue(fixtures.eventTrends);
  mockEventsController.getEventKeywords.mockResolvedValue(fixtures.eventKeywords);
  mockEventsController.getEventMilestones.mockResolvedValue(fixtures.eventMilestones);
  mockEventsController.getEventTopicOverview.mockResolvedValue(fixtures.eventTopicOverview);
  mockEventsController.getEventInstitutions.mockResolvedValue(fixtures.eventInstitutions);
  mockEventsController.getEventOpinionClusters.mockResolvedValue(fixtures.eventOpinionClusters);
  mockEventsController.getEventEmotionMap.mockResolvedValue(fixtures.eventEmotionMap);
  mockEventsController.getEventUserEmotionInsights.mockResolvedValue(fixtures.eventUserEmotionInsights);
  mockEventsController.getEventSentimentTrendDetailed.mockResolvedValue(fixtures.eventSentimentTrendDetailed);
  mockEventsController.getEventRiskProfile.mockResolvedValue(fixtures.eventRiskProfile);
  mockEventsController.getEventAbnormalUsers.mockResolvedValue(fixtures.eventAbnormalUsers);
  mockEventsController.getEngagementTrend.mockResolvedValue(fixtures.engagementTrend);
  mockEventsController.getEventUserRelations.mockResolvedValue(fixtures.eventUserRelations);
  mockEventsController.getEventGeographic.mockResolvedValue(fixtures.eventGeographic);
  mockEventsController.getSentimentHotness.mockResolvedValue(fixtures.sentimentHotness);
  mockEventsController.getSentimentIntensity.mockResolvedValue(fixtures.sentimentIntensity);
  mockEventsController.getAnomalies.mockResolvedValue(fixtures.anomalies);
  mockEventsController.refreshCache.mockResolvedValue({ success: true });
  mockEventsController.updateEventKeywords.mockResolvedValue({ success: true });

  mockSpreadBreadthController.getAnalysis.mockResolvedValue(fixtures.spreadBreadth);

  mockMediaTypeController.getDistribution.mockResolvedValue(fixtures.mediaTypeDistribution);

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
};
