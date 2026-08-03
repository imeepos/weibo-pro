/**
 * EventDetail 测试 mock 注册文件。
 * 从 EventDetail.test-utils 中拆分,集中管理全部 vi.mock 块。
 * 注意:测试文件必须将该模块(或 test-utils)作为第一个 import,确保 mock 先于被测模块注册。
 */
import { vi } from 'vitest';
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
