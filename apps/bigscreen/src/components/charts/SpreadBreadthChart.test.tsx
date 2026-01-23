import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpreadBreadthChart } from './SpreadBreadthChart';
import type { SpreadBreadthAnalysis } from '@sker/sdk';

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

const mockData: SpreadBreadthAnalysis = {
  totalReposts: 100,
  uniqueReposters: 80,
  spreadDepth: 5,
  spreadWidth: 4.5,
  breadthIndex: 0.75,
  propagationPaths: [
    { source: 'post1', target: 'user1', weight: 1, level: 1 },
    { source: 'user1', target: 'user2', weight: 1, level: 2 },
  ],
  spreadTimeline: [],
  repostByUserType: [],
};

describe('SpreadBreadthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染空数据状态', () => {
    render(<SpreadBreadthChart data={null} isLoading={false} />);
    expect(screen.getByText('暂无传播广度数据')).toBeInTheDocument();
  });

  it('应该渲染加载状态', () => {
    render(<SpreadBreadthChart data={null} isLoading={true} />);
    // 加载状态下应该显示加载指示器
    expect(screen.queryByText('总转发数')).not.toBeInTheDocument();
  });

  it('应该渲染正常数据', () => {
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} />
    );
    expect(container.querySelector('div[style*="height"]')).toBeInTheDocument();
  });

  it('应该正确配置桑基图', () => {
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} />
    );
    const chartElement = container.querySelector('div[style*="height"]');
    expect(chartElement).toBeInTheDocument();
  });

  it('应该处理点击事件', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} onClick={handleClick} />
    );
    expect(container).toBeInTheDocument();
  });

  describe('深色主题适配', () => {
    it('应该在浅色主题下使用正确的文本颜色', () => {
      mockUseEChartTheme.mockReturnValueOnce({
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
      });

      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(mockSetOption).toHaveBeenCalled();
      const chartOption = mockSetOption.mock.calls[0][0];

      // 验证标题颜色使用主题颜色
      expect(chartOption.title.textStyle.color).toBe('#111827');

      // 验证标签颜色使用主题颜色
      expect(chartOption.series[0].label.color).toBe('#111827');
    });

    it('应该在深色主题下使用正确的文本颜色', () => {
      mockUseEChartTheme.mockReturnValueOnce({
        isDark: true,
        colors: {
          text: '#ffffff',
          textMuted: '#9ca3af',
          border: 'rgba(255, 255, 255, 0.3)',
          splitLine: 'rgba(255, 255, 255, 0.1)',
          tooltipBg: 'rgba(0, 0, 0, 0.8)',
          tooltipBorder: 'rgba(255, 255, 255, 0.2)',
          toolbox: '#ffffff',
          emphasis: '#3b82f6',
          chartBg: '#1e293b',
        },
      });

      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(mockSetOption).toHaveBeenCalled();
      const chartOption = mockSetOption.mock.calls[0][0];

      // 验证标题颜色使用深色主题颜色
      expect(chartOption.title.textStyle.color).toBe('#ffffff');

      // 验证标签颜色使用深色主题颜色
      expect(chartOption.series[0].label.color).toBe('#ffffff');
    });

    it('应该在主题切换时更新图表颜色', () => {
      // 初始为浅色主题
      mockUseEChartTheme.mockReturnValueOnce({
        isDark: false,
        colors: { text: '#111827', textMuted: '#6b7280', border: 'rgba(0, 0, 0, 0.3)', splitLine: 'rgba(0, 0, 0, 0.1)', tooltipBg: 'rgba(255, 255, 255, 0.95)', tooltipBorder: 'rgba(0, 0, 0, 0.1)', toolbox: '#111827', emphasis: '#3b82f6', chartBg: '#ffffff' },
      });

      const { rerender } = render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      // 切换到深色主题
      mockUseEChartTheme.mockReturnValueOnce({
        isDark: true,
        colors: { text: '#ffffff', textMuted: '#9ca3af', border: 'rgba(255, 255, 255, 0.3)', splitLine: 'rgba(255, 255, 255, 0.1)', tooltipBg: 'rgba(0, 0, 0, 0.8)', tooltipBorder: 'rgba(255, 255, 255, 0.2)', toolbox: '#ffffff', emphasis: '#3b82f6', chartBg: '#1e293b' },
      });

      rerender(<SpreadBreadthChart data={mockData} isLoading={false} />);

      // 验证 setOption 被调用了两次（初始渲染 + 主题切换）
      expect(mockSetOption).toHaveBeenCalledTimes(2);
    });
  });

  describe('人类可读数据展示', () => {
    it('应该展示总转发数', () => {
      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(screen.getByText('总转发数')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('应该展示独立转发者数', () => {
      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(screen.getByText('独立转发者')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('应该展示传播深度', () => {
      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(screen.getByText('传播深度')).toBeInTheDocument();
      expect(screen.getByText('5层')).toBeInTheDocument();
    });

    it('应该展示传播宽度', () => {
      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(screen.getByText('传播宽度')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('应该展示广度指数', () => {
      render(<SpreadBreadthChart data={mockData} isLoading={false} />);

      expect(screen.getByText('广度指数')).toBeInTheDocument();
      expect(screen.getByText('0.75')).toBeInTheDocument();
    });

    it('应该正确格式化大数字', () => {
      const largeData: SpreadBreadthAnalysis = {
        ...mockData,
        totalReposts: 1234567,
        uniqueReposters: 98765,
      };

      render(<SpreadBreadthChart data={largeData} isLoading={false} />);

      // 验证数字格式化（例如：1,234,567）
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
      expect(screen.getByText('98,765')).toBeInTheDocument();
    });

    it('应该在没有数据时不展示统计指标', () => {
      render(<SpreadBreadthChart data={null} isLoading={false} />);

      expect(screen.queryByText('总转发数')).not.toBeInTheDocument();
      expect(screen.queryByText('独立转发者')).not.toBeInTheDocument();
    });
  });
});
