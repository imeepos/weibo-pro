import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NetworkCentralityGraph from './NetworkCentralityGraph';
import { mockData, emptyMockData, mockBrowserApis, getMockChartInstance } from './NetworkCentralityGraph.test.setup';

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

// Mock ChartState component
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({ loading, error, empty, loadingText, emptyText, message }: any) => (
    <div data-testid="chart-state">
      {loading && <span data-testid="loading-state">{loadingText || '加载中...'}</span>}
      {error && <span data-testid="error-state">{message || error}</span>}
      {empty && <span data-testid="empty-state">{emptyText || message || '暂无数据'}</span>}
    </div>
  ),
}));

describe('NetworkCentralityGraph', () => {
  beforeEach(() => {
    // 清除 mock 调用记录，但不清除 mock 本身
    const mockInstance = getMockChartInstance();
    mockInstance.setOption.mockClear();
    mockInstance.on.mockClear();
    mockInstance.off.mockClear();
    mockInstance.resize.mockClear();
    mockInstance.dispose.mockClear();

    mockBrowserApis();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('6. 节点点击交互', () => {
    it('应该触发节点点击事件', async () => {
      const handleClick = vi.fn();
      render(<NetworkCentralityGraph data={mockData} onClick={handleClick} />);

      await waitFor(() => {
        expect(getMockChartInstance().on).toHaveBeenCalledWith('click', expect.any(Function));
      });
    });
  });

  describe('7. 空数据状态', () => {
    it('应该显示空数据状态', () => {
      render(<NetworkCentralityGraph data={null} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('暂无网络数据')).toBeTruthy();
    });

    it('应该在节点为空时显示空状态', () => {
      render(<NetworkCentralityGraph data={emptyMockData} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });

  describe('8. 加载状态', () => {
    it('应该显示加载状态', () => {
      render(<NetworkCentralityGraph data={mockData} isLoading={true} />);

      expect(screen.getByTestId('loading-state')).toBeTruthy();
      expect(screen.getByText('加载中...')).toBeTruthy();
    });
  });

  describe('9. 错误状态', () => {
    it('应该显示错误状态', () => {
      const error = new Error('加载失败');
      render(<NetworkCentralityGraph data={mockData} error={error} />);

      expect(screen.getByTestId('error-state')).toBeTruthy();
      expect(screen.getByText('加载失败')).toBeTruthy();
    });
  });

  describe('10. 响应式布局', () => {
    it('应该在窗口大小变化时调用 resize', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

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
        <NetworkCentralityGraph data={mockData} height={600} />
      );

      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer.style.height).toBe('600px');
    });
  });
});
