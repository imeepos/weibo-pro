/**
 * 布局系统数据提供者测试
 *
 * 目标：生产路径禁止 mock/演示数据。
 * - kpi-metrics / StatsOverview 必须渲染 useOverviewData 的真实统计
 * - sentiment-overview 必须渲染真实情感数据
 * - user-behavior-chart 必须渲染真实事件序列
 * - geographic-map / count-up / metric-card 演示组件已移除，回退"暂未配置"
 * - StatsOverview 的 sparkline 只渲染真实趋势数据（无 trendData 时不渲染）
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderComponent, legacyComponentMap } from './LayoutComponentProvider';
import StatsOverview from '@/components/ui/StatsOverview';

// 真实数据源 hook 桩：返回真实 API 形状的数据，而非 generateComponentData 的随机值
vi.mock('@/hooks/useOverviewData', () => ({
  useOverviewData: () => ({
    statsOverviewData: {
      events: { value: 111, change: 1 },
      posts: { value: 222, change: 2 },
      users: { value: 333, change: 3 },
      interactions: { value: 444, change: 4 },
    },
    sentimentData: { positive: 30, negative: 10, neutral: 60 },
    loading: false,
    error: null,
    isStale: false,
    isRefreshing: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChartData', () => ({
  useWordCloudData: () => ({
    data: [],
    loading: false,
    error: null,
    isStale: false,
    isRefreshing: false,
    refetch: vi.fn(),
  }),
  useEventCountSeries: () => ({
    data: [
      { timestamp: 'a', value: 5 },
      { timestamp: 'b', value: 9 },
    ],
    loading: false,
    error: null,
    isStale: false,
    isRefreshing: false,
    refetch: vi.fn(),
  }),
  usePostCountSeries: () => ({
    data: [
      { timestamp: 'a', value: 10 },
      { timestamp: 'b', value: 20 },
    ],
    loading: false,
    error: null,
    isStale: false,
    isRefreshing: false,
    refetch: vi.fn(),
  }),
}));

// 捕获 MiniTrendChart 收到的数据（验证 sparkline 用的是真实趋势）
vi.mock('@/components/charts/MiniTrendChart', () => ({
  default: ({ data }: { data: number[] }) => (
    <div data-testid="mini-trend" data-values={JSON.stringify(data)} />
  ),
}));

// MetricCard 透出标题/数值/chartComponent，便于断言真实数据与 sparkline
vi.mock('@sker/ui/components/ui/metric-card', () => ({
  MetricCard: ({ title, value, chartComponent }: { title: string; value?: number; chartComponent?: React.ReactNode }) => (
    <div data-testid={`metric-${title}`} data-value={value}>{title}{chartComponent}</div>
  ),
}));

// SentimentOverview 内部 ECharts 桩
vi.mock('@sker/ui/components/ui/echart-native', () => ({
  EChartNative: () => <div data-testid="echart-native" />,
}));

// 重型图表组件桩：wrappers 导入链中的模块在 jsdom 下导入期崩溃（echarts-wordcloud 等）
vi.mock('@/components/charts/WordCloudChart', () => ({
  default: () => <div data-testid="word-cloud-chart" />,
}));
vi.mock('@/components/charts/SentimentTrendChart', () => ({
  default: () => <div data-testid="sentiment-trend-chart" />,
}));
vi.mock('@/components/charts/GeographicChart', () => ({
  default: () => <div data-testid="geographic-chart" />,
}));
vi.mock('@/components/charts/LocationHeatMap', () => ({
  default: () => <div data-testid="location-heat-map" />,
}));
vi.mock('@/components/charts/HotEventsList', () => ({
  default: () => <div data-testid="hot-events-list" />,
}));
vi.mock('@/components/charts/SimpleSentimentPieChart', () => ({
  default: () => <div data-testid="sentiment-pie" />,
}));
vi.mock('@/components/charts/EmotionCurveChart', () => ({
  default: () => <div data-testid="emotion-curve" />,
}));
vi.mock('@/components/charts/EventTypeBarChart', () => ({
  default: () => <div data-testid="event-type-bar" />,
}));
vi.mock('@/components/charts/AgeDistributionChart', () => ({
  default: () => <div data-testid="age-dist" />,
}));
vi.mock('@/components/charts/EventCountChart', () => ({
  default: () => <div data-testid="event-count" />,
}));
vi.mock('@/components/charts/EventDevelopmentChart', () => ({
  default: () => <div data-testid="event-dev" />,
}));
vi.mock('@/components/charts/EventTimelineChart', () => ({
  default: () => <div data-testid="event-timeline" />,
}));
vi.mock('@/components/charts/EventTypePieChart', () => ({
  default: () => <div data-testid="event-type-pie" />,
}));
vi.mock('@/components/charts/GenderDistributionChart', () => ({
  default: () => <div data-testid="gender-dist" />,
}));
vi.mock('@/components/charts/HotTopicsChart', () => ({
  default: () => <div data-testid="hot-topics" />,
}));
vi.mock('@/components/charts/InfluenceNetworkFlow', () => ({
  default: () => <div data-testid="influence-flow" />,
}));
vi.mock('@/components/charts/PostCountChart', () => ({
  default: () => <div data-testid="post-count" />,
}));
vi.mock('@/components/charts/PropagationPathChart', () => ({
  default: () => <div data-testid="prop-path" />,
}));
vi.mock('@/components/charts/SentimentPieChart', () => ({
  default: () => <div data-testid="sentiment-pie-full" />,
}));
vi.mock('@/components/charts/SimpleNetworkFlow', () => ({
  default: () => <div data-testid="simple-network" />,
}));
vi.mock('@/components/charts/TimeSeriesChart', () => ({
  default: () => <div data-testid="time-series" />,
}));
vi.mock('@/components/ui/FullscreenIndicator', () => ({
  default: () => <div data-testid="fullscreen" />,
}));
vi.mock('@/components/ui/NavigationMenu', () => ({
  default: () => <div data-testid="navigation-menu" />,
}));

describe('LayoutComponentProvider 数据提供者（禁止 mock/演示数据）', () => {
  it('kpi-metrics 渲染 useOverviewData 的真实统计（111/222/333/444，非随机值）', () => {
    render(renderComponent('kpi-metrics'));
    // 真实数据 111/222/333/444，而非 generateComponentData 的 Math.random 值
    expect(screen.getByTestId('metric-事件数')).toHaveAttribute('data-value', '111');
    expect(screen.getByTestId('metric-贴子数')).toHaveAttribute('data-value', '222');
    expect(screen.getByTestId('metric-用户数量')).toHaveAttribute('data-value', '333');
    expect(screen.getByTestId('metric-互动数')).toHaveAttribute('data-value', '444');
  });

  it('legacy StatsOverview 渲染真实统计（默认布局首屏无假数据）', () => {
    const Legacy = legacyComponentMap['StatsOverview'] as React.ComponentType;
    render(<Legacy />);
    expect(screen.getByTestId('metric-事件数')).toHaveAttribute('data-value', '111');
    expect(screen.getByTestId('metric-贴子数')).toHaveAttribute('data-value', '222');
  });

  it('sentiment-overview 渲染真实情感数据（30/10/60）而非硬编码 1234/456/890', () => {
    render(renderComponent('sentiment-overview'));
    expect(screen.getAllByText('30%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
  });

  it('user-behavior-chart 渲染真实事件序列而非 Math.random 伪数据', () => {
    render(renderComponent('user-behavior-chart'));
    const trend = screen.getByTestId('mini-trend');
    expect(trend).toHaveAttribute('data-values', JSON.stringify([5, 9]));
  });

  it('geographic-map 演示组件已移除，回退暂未配置', () => {
    render(renderComponent('geographic-map'));
    expect(screen.getByText('暂未配置')).toBeInTheDocument();
  });

  it('count-up 演示组件已移除，回退暂未配置', () => {
    render(renderComponent('count-up'));
    expect(screen.getByText('暂未配置')).toBeInTheDocument();
  });

  it('metric-card 演示组件已移除，回退暂未配置', () => {
    render(renderComponent('metric-card'));
    expect(screen.getByText('暂未配置')).toBeInTheDocument();
  });
});

describe('StatsOverview sparkline（禁止硬编码趋势数组）', () => {
  it('提供真实 trendData 时仅渲染事件/帖子 sparkline', () => {
    render(
      <StatsOverview
        data={{
          events: { value: 111, change: 0 },
          posts: { value: 222, change: 0 },
          users: { value: 333, change: 0 },
          interactions: { value: 444, change: 0 },
        }}
        trendData={{ event: [1, 2, 3], post: [4, 5, 6] }}
      />
    );

    const trends = screen.getAllByTestId('mini-trend');
    // 只有事件/帖子两条真实 sparkline，用户/互动无真实序列 API 则不渲染
    expect(trends).toHaveLength(2);
    const values = trends.map((t) => t.getAttribute('data-values'));
    expect(values).toContain(JSON.stringify([1, 2, 3]));
    expect(values).toContain(JSON.stringify([4, 5, 6]));
    expect(screen.queryByTestId('metric-用户数量')?.querySelector('[data-testid="mini-trend"]')).toBeNull();
    expect(screen.queryByTestId('metric-互动数')?.querySelector('[data-testid="mini-trend"]')).toBeNull();
  });

  it('未提供 trendData 时不渲染任何假 sparkline', () => {
    render(
      <StatsOverview
        data={{
          events: { value: 111, change: 0 },
          posts: { value: 222, change: 0 },
          users: { value: 333, change: 0 },
          interactions: { value: 444, change: 0 },
        }}
      />
    );
    expect(screen.queryAllByTestId('mini-trend')).toHaveLength(0);
  });
});
