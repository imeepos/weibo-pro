import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataOverview from './DataOverview';

vi.mock('@/hooks/useOverviewData', () => ({
  useOverviewData: () => ({
    statsOverviewData: {
      events: { value: 12, change: 5 },
      posts: { value: 120, change: 10 },
      users: { value: 48, change: 3 },
      interactions: { value: 300, change: 18 },
    },
    sentimentData: {
      positive: 30,
      negative: 10,
      neutral: 60,
      total: 100,
      positivePercentage: 30,
      negativePercentage: 10,
      neutralPercentage: 60,
      trend: 'stable',
      avgScore: 0.2,
    },
    loading: false,
    error: null,
    isStale: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChartData', () => ({
  useWordCloudData: () => ({ data: [] }),
}));

vi.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    selectedTimeRange: '24h',
  }),
}));

vi.mock('@sker/core', async () => {
  const actual = await vi.importActual<typeof import('@sker/core')>('@sker/core');
  return {
    ...actual,
    root: {
      get: () => ({
        getLocations: vi.fn().mockResolvedValue([]),
      }),
    },
    createLogger: () => ({ error: vi.fn() }),
  };
});

vi.mock('@sker/sdk', () => ({
  OverviewController: class OverviewController {},
}));

vi.mock('@/components/charts/EventTypeBarChart', () => ({
  default: () => <div data-testid="event-type-chart" />,
}));

vi.mock('@/components/charts/WordCloudChart', () => ({
  default: () => <div data-testid="word-cloud-chart" />,
}));

vi.mock('@/components/charts/HotEventsList', () => ({
  default: () => <div data-testid="hot-events-list" />,
}));

vi.mock('@/components/charts/EmotionCurveChart', () => ({
  default: () => <div data-testid="emotion-curve-chart" />,
}));

vi.mock('@/components/ui', () => ({
  StatsOverview: () => <div data-testid="stats-overview" />,
  SentimentOverview: () => <div data-testid="sentiment-overview" />,
  ErrorState: ({ error }: { error?: string }) => <div>{error}</div>,
  EmptyState: ({ title }: { title?: string }) => <div>{title}</div>,
}));

vi.mock('@sker/ui/components/ui/geo-heat-map', () => ({
  default: () => <div data-testid="geo-heat-map" />,
}));

vi.mock('@/components', () => ({
  UserRelationOverview: () => (
    <div data-testid="user-relation-overview">network summary</div>
  ),
}));

describe('DataOverview', () => {
  it('labels the network section as a summary area', async () => {
    render(<DataOverview />);

    expect(await screen.findByText('用户网络摘要')).toBeInTheDocument();
    expect(
      screen.getByText('关系强度与社区规模快速概览'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('user-relation-overview')).toBeInTheDocument();
  });
});
