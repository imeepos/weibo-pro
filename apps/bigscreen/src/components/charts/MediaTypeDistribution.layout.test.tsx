import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MediaTypeDistribution from './MediaTypeDistribution';
import * as echarts from 'echarts';
import { mockData } from './MediaTypeDistribution.fixtures';

// Mock ECharts - 必须在工厂函数内部定义
vi.mock('echarts', () => {
  const mockChartInstance = {
    setOption: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    init: vi.fn(() => mockChartInstance),
    // 导出 mock 实例供测试使用
    __mockChartInstance: mockChartInstance,
  };
});

// 获取 mock 实例
const getMockChartInstance = () => (echarts as any).__mockChartInstance;

// Mock ChartState component
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({ loading, error, empty, loadingText, emptyText, message, children }: any) => {
    if (loading) {
      return <div data-testid="chart-state"><span data-testid="loading-state">{loadingText || '加载中...'}</span></div>;
    }
    if (error) {
      return <div data-testid="chart-state"><span data-testid="error-state">{message || error}</span></div>;
    }
    if (empty) {
      return <div data-testid="chart-state"><span data-testid="empty-state">{emptyText || message || '暂无数据'}</span></div>;
    }
    return <div data-testid="chart-state">{children}</div>;
  },
}));

describe('MediaTypeDistribution 布局与外观', () => {
  let mockResizeObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 清除 mock 调用记录，但不清除 mock 本身
    const mockInstance = getMockChartInstance();
    mockInstance.setOption.mockClear();
    mockInstance.on.mockClear();
    mockInstance.off.mockClear();
    mockInstance.resize.mockClear();
    mockInstance.dispose.mockClear();
    (echarts.init as any).mockClear();

    // Mock window.resize
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();

    // Mock ResizeObserver
    mockResizeObserver = vi.fn();
    mockResizeObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });
    window.ResizeObserver = mockResizeObserver as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('8. 响应式布局', () => {
    it('应该在窗口大小变化时调用 resize', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      });

      // 触发 resize 事件
      const resizeCallback = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'resize'
      )[1];
      resizeCallback();

      await waitFor(() => {
        expect(getMockChartInstance().resize).toHaveBeenCalled();
      });
    });

    it('应该支持自定义高度', () => {
      const { container } = render(
        <MediaTypeDistribution data={mockData} height={600} />
      );

      // 查找实际的图表容器（ChartState 的子元素）
      const chartContainer = container.querySelector('div[style*="height"]');
      expect(chartContainer).toBeTruthy();
      if (chartContainer) {
        expect(chartContainer.getAttribute('style')).toContain('600px');
      }
    });
  });

  describe('9. 颜色配置', () => {
    it('应该为不同媒体类型设置不同颜色', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const colors = option.color;

        // 验证有5种颜色对应5种媒体类型
        expect(colors).toHaveLength(5);
      });
    });
  });

  describe('10. 图例显示', () => {
    it('应该显示图例', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];

        expect(option.legend).toBeDefined();
        expect(option.legend.orient).toBe('vertical');
        expect(option.legend.right).toBe('10%');
        expect(option.legend.top).toBe('center');
      });
    });

    it('应该显示所有媒体类型的图例', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const legendData = option.legend.data;

        expect(legendData).toHaveLength(5);
        // 图例数据应该只包含类型名称，不包含百分比
        expect(legendData[0]).toBe('纯文本');
        expect(legendData[1]).toBe('图片');
        expect(legendData[2]).toBe('视频');
        expect(legendData[3]).toBe('链接');
        expect(legendData[4]).toBe('混合');
      });
    });
  });
});
