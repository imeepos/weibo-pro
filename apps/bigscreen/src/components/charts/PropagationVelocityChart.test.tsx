import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropagationVelocityChart } from './PropagationVelocityChart';
import type { PropagationVelocityAnalysis, VelocityTimePoint } from '@sker/sdk';

// Mock @/utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock ChartState 组件
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({ loading, error, empty, loadingText, emptyText }: {
    loading?: boolean;
    error?: string;
    empty?: boolean;
    loadingText?: string;
    emptyText?: string;
  }) => {
    if (loading) return <div data-testid="chart-loading">{loadingText || '加载中...'}</div>;
    if (error) return <div data-testid="chart-error">{error}</div>;
    if (empty) return <div data-testid="chart-empty">{emptyText || '暂无数据'}</div>;
    return null;
  },
}));

// Mock EChart 组件
vi.mock('@sker/ui/components/ui/echart', () => ({
  EChart: ({ option: _option, height, className }: { option: any; height: number; className?: string }) => (
    <div data-testid="echart" className={className} style={{ height }}>
      EChart Mock
    </div>
  ),
}));

const mockVelocityTimePoints: VelocityTimePoint[] = [
  {
    timestamp: '2026-01-23T10:00:00Z',
    velocity: 100,
    acceleration: 10,
    cumulativeReposts: 100,
  },
  {
    timestamp: '2026-01-23T11:00:00Z',
    velocity: 150,
    acceleration: 20,
    cumulativeReposts: 250,
  },
  {
    timestamp: '2026-01-23T12:00:00Z',
    velocity: 200,
    acceleration: 30,
    cumulativeReposts: 450,
  },
];

const mockData: PropagationVelocityAnalysis = {
  currentVelocity: 200,
  peakVelocity: 250,
  avgVelocity: 150,
  acceleration: 30,
  accelerationTrend: 'increasing',
  velocityTimeline: mockVelocityTimePoints,
  predictedBurstTime: '2026-01-23T14:00:00Z',
  burstProbability: 0.75,
  currentPhase: 'growth',
  phaseStartTime: '2026-01-23T10:00:00Z',
  eventId: 'test-event-1',
  calculatedAt: '2026-01-23T12:00:00Z',
};

describe('PropagationVelocityChart', () => {
  it('应该渲染空数据状态', () => {
    render(
      <PropagationVelocityChart data={null} isLoading={false} />
    );
    expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
    expect(screen.getByText('暂无传播速度数据')).toBeInTheDocument();
  });

  it('应该渲染加载状态', () => {
    render(
      <PropagationVelocityChart data={null} isLoading={true} />
    );
    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
  });

  it('应该渲染错误状态', () => {
    const error = new Error('测试错误');
    render(
      <PropagationVelocityChart data={null} isLoading={false} error={error} />
    );
    expect(screen.getByTestId('chart-error')).toBeInTheDocument();
    expect(screen.getByText('测试错误')).toBeInTheDocument();
  });

  it('应该渲染正常数据', () => {
    render(
      <PropagationVelocityChart data={mockData} isLoading={false} />
    );

    // 检查基础指标
    expect(screen.getByText('200')).toBeInTheDocument(); // 当前速度
    expect(screen.getByText('250')).toBeInTheDocument(); // 峰值速度
    expect(screen.getByText('150')).toBeInTheDocument(); // 平均速度

    // 检查加速度
    expect(screen.getByText(/30.*增长中|增长中.*30/)).toBeInTheDocument(); // 加速度和趋势在同一行

    // 检查传播阶段
    expect(screen.getByText(/增长期/)).toBeInTheDocument();

    // 检查爆发概率
    expect(screen.getByText('75.0%')).toBeInTheDocument();

    // 检查图表渲染
    expect(screen.getByTestId('echart')).toBeInTheDocument();
  });

  it('应该正确显示传播阶段', () => {
    const { rerender } = render(
      <PropagationVelocityChart data={mockData} isLoading={false} />
    );

    expect(screen.getByText(/增长期/)).toBeInTheDocument();

    const initialPhaseData = {
      ...mockData,
      currentPhase: 'initial' as const,
    };
    rerender(<PropagationVelocityChart data={initialPhaseData} isLoading={false} />);
    expect(screen.getByText(/初始期/)).toBeInTheDocument();

    const peakPhaseData = {
      ...mockData,
      currentPhase: 'peak' as const,
    };
    rerender(<PropagationVelocityChart data={peakPhaseData} isLoading={false} />);
    expect(screen.getByText(/爆发期/)).toBeInTheDocument();

    const declinePhaseData = {
      ...mockData,
      currentPhase: 'decline' as const,
    };
    rerender(<PropagationVelocityChart data={declinePhaseData} isLoading={false} />);
    expect(screen.getByText(/衰退期/)).toBeInTheDocument();

    const stablePhaseData = {
      ...mockData,
      currentPhase: 'stable' as const,
    };
    rerender(<PropagationVelocityChart data={stablePhaseData} isLoading={false} />);
    expect(screen.getByText(/稳定期/)).toBeInTheDocument();
  });

  it('应该正确显示加速度趋势', () => {
    const { rerender } = render(
      <PropagationVelocityChart data={mockData} isLoading={false} />
    );

    expect(screen.getByText(/增长中/)).toBeInTheDocument();

    const stableTrendData = {
      ...mockData,
      accelerationTrend: 'stable' as const,
    };
    rerender(<PropagationVelocityChart data={stableTrendData} isLoading={false} />);
    expect(screen.getByText(/稳定/)).toBeInTheDocument();

    const decreasingTrendData = {
      ...mockData,
      accelerationTrend: 'decreasing' as const,
    };
    rerender(<PropagationVelocityChart data={decreasingTrendData} isLoading={false} />);
    expect(screen.getByText(/下降中/)).toBeInTheDocument();
  });

  it('应该渲染有预测爆发时间的情况', () => {
    render(
      <PropagationVelocityChart data={mockData} isLoading={false} />
    );

    // 检查预测爆发时间显示
    expect(screen.getByText('预测爆发时间')).toBeInTheDocument();
  });

  it('应该处理没有预测爆发时间的情况', () => {
    const noBurstTimeData = {
      ...mockData,
      predictedBurstTime: undefined,
    };

    render(
      <PropagationVelocityChart data={noBurstTimeData} isLoading={false} />
    );

    // 应该不显示预测爆发时间
    expect(screen.queryByText('预测爆发时间')).not.toBeInTheDocument();
  });
});
