import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpreadBreadthChart } from './SpreadBreadthChart';
import {
  mockData,
  mockDataWithAggregation,
} from './SpreadBreadthChart.fixtures';

// Hoisted mocks
const { mockSetOption, mockEChartsInstance, mockUseEChartTheme } = vi.hoisted(() => {
  const mockSetOption = vi.fn();
  const mockEChartsInstance = {
    setOption: mockSetOption,
    on: vi.fn(),
    off: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  };

  const mockUseEChartTheme = vi.fn(() => ({
    isDark: false,
    colors: {
      text: '#111827',
      textMuted: '#6b7280',
      border: 'rgba(0, 0, 0, 0.3)',
      splitLine: 'rgba(0, 0, 0, 0.1)',
      tooltipBg: 'rgba(255, 255, 255, 0.95)',
      tooltipBorder: 'rgba(0, 0, 0, 0.1)',
      toolbox: '#111827',
      emphasis: '#3b82f6',
      chartBg: '#ffffff',
    },
  }));

  return { mockSetOption, mockEChartsInstance, mockUseEChartTheme };
});

// Mock echarts
vi.mock('echarts', () => {
  return {
    default: {
      init: vi.fn(() => mockEChartsInstance),
    },
    init: vi.fn(() => mockEChartsInstance),
  };
});

// Mock @/utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock useEChartTheme hook
vi.mock('@sker/ui/hooks/use-echart-theme', () => ({
  useEChartTheme: mockUseEChartTheme,
}));

describe('SpreadBreadthChart 聚合数据展示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该优先使用聚合数据渲染桑基图', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    expect(mockSetOption).toHaveBeenCalled();
    const chartOption = mockSetOption.mock.calls[0][0];

    // 验证使用了聚合数据的节点
    expect(chartOption.series[0].data.length).toBe(5);
    expect(chartOption.series[0].links.length).toBe(4);
  });

  it('应该为源节点使用金色', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const sourceNode = chartOption.series[0].data.find((n: any) => n.nodeType === 'source');

    expect(sourceNode.itemStyle.color).toBe('#fbbf24');
  });

  it('应该为VIP聚合节点使用紫色', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const vipNode = chartOption.series[0].data.find(
      (n: any) => n.nodeType === 'aggregated' && n.userType === 'vip'
    );

    expect(vipNode.itemStyle.color).toBe('#a78bfa');
  });

  it('应该为普通用户聚合节点使用蓝色', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const ordinaryNode = chartOption.series[0].data.find(
      (n: any) => n.nodeType === 'aggregated' && n.userType === 'ordinary'
    );

    expect(ordinaryNode.itemStyle.color).toBe('#60a5fa');
  });

  it('应该为认证用户聚合节点使用绿色', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const verifiedNode = chartOption.series[0].data.find(
      (n: any) => n.nodeType === 'aggregated' && n.userType === 'verified'
    );

    expect(verifiedNode.itemStyle.color).toBe('#34d399');
  });

  it('应该为Top用户节点使用粉色', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const topUserNode = chartOption.series[0].data.find((n: any) => n.nodeType === 'top_user');

    expect(topUserNode.itemStyle.color).toBe('#f472b6');
  });

  it('应该在没有聚合数据时回退到原有逻辑', () => {
    render(<SpreadBreadthChart data={mockData} isLoading={false} />);

    expect(mockSetOption).toHaveBeenCalled();
    const chartOption = mockSetOption.mock.calls[0][0];

    // 验证使用了原有的 propagationPaths 数据
    expect(chartOption.series[0].data.length).toBe(3); // post1, user1, user2
    expect(chartOption.series[0].links.length).toBe(2);
  });

  it('应该为聚合节点始终显示标签', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const aggregatedNode = chartOption.series[0].data.find(
      (n: any) => n.nodeType === 'aggregated'
    );

    expect(aggregatedNode.label?.show).toBe(true);
  });

  it('应该在聚合节点数据中包含 topUsers 信息', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    const chartOption = mockSetOption.mock.calls[0][0];
    const vipNode = chartOption.series[0].data.find(
      (n: any) => n.nodeType === 'aggregated' && n.userType === 'vip'
    );

    expect(vipNode.topUsers).toBeDefined();
    expect(vipNode.topUsers.length).toBe(2);
  });

  it('应该展示层级统计信息', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    // 验证层级统计区域存在
    expect(screen.getByText('层级分布')).toBeInTheDocument();
    expect(screen.getByText('第1层')).toBeInTheDocument();
  });

  it('应该在层级统计中显示用户类型分布', () => {
    render(<SpreadBreadthChart data={mockDataWithAggregation} isLoading={false} />);

    // 验证显示了各类型用户数量
    expect(screen.getByText(/VIP.*50/)).toBeInTheDocument();
    expect(screen.getByText(/普通.*100/)).toBeInTheDocument();
    expect(screen.getByText(/认证.*30/)).toBeInTheDocument();
  });
});
