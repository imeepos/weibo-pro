import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NetworkCentralityGraph from './NetworkCentralityGraph';
import type { CentralityAnalysis } from '@sker/sdk';
import * as echarts from 'echarts';

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
  ChartState: ({ loading, error, empty, loadingText, emptyText, message }: any) => (
    <div data-testid="chart-state">
      {loading && <span data-testid="loading-state">{loadingText || '加载中...'}</span>}
      {error && <span data-testid="error-state">{message || error}</span>}
      {empty && <span data-testid="empty-state">{emptyText || message || '暂无数据'}</span>}
    </div>
  ),
}));

const mockData: CentralityAnalysis = {
  nodes: [
    {
      userId: '1',
      screenName: '用户1',
      degreeCentrality: 0.8,
      weightedDegree: 100,
      influenceScore: 9.5,
      nodeSize: 50,
    },
    {
      userId: '2',
      screenName: '用户2',
      degreeCentrality: 0.6,
      weightedDegree: 80,
      influenceScore: 5.2, // 修改为中等影响力 (4-7)
      nodeSize: 40,
    },
    {
      userId: '3',
      screenName: '用户3',
      degreeCentrality: 0.4,
      weightedDegree: 50,
      influenceScore: 3.1, // 修改为低影响力 (<4)
      nodeSize: 30,
    },
  ],
  edges: [
    { source: '1', target: '2', weight: 0.8 },
    { source: '2', target: '3', weight: 0.5 },
    { source: '1', target: '3', weight: 0.3 },
  ],
  networkStats: {
    nodeCount: 3,
    edgeCount: 3,
    avgDegree: 2.0,
    maxDegree: 2,
    density: 0.5,
  },
  topInfluencers: [
    { userId: '1', screenName: '用户1', score: 9.5, rank: 1 },
    { userId: '2', screenName: '用户2', score: 7.2, rank: 2 },
  ],
};

describe('NetworkCentralityGraph', () => {
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

  describe('1. 组件正常渲染', () => {
    it('应该渲染组件容器', () => {
      const { container } = render(
        <NetworkCentralityGraph data={mockData} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该渲染图表容器', async () => {
      const { container } = render(
        <NetworkCentralityGraph data={mockData} />
      );
      await waitFor(() => {
        const chartContainer = container.querySelector('div');
        expect(chartContainer).toBeTruthy();
      });
    });
  });

  describe('2. 力导向图显示正确', () => {
    it('应该初始化 ECharts 实例', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          expect(instance.setOption).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('应该设置正确的图表配置', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        expect(instance.setOption).toHaveBeenCalled();
        expect(instance.setOption).toHaveBeenCalled();
        const option = instance.setOption.mock.calls[0][0];
        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('graph');
        expect(option.series[0].layout).toBe('force');
      });
    });
  });

  describe('3. 节点大小映射正确', () => {
    it('应该根据影响力得分映射节点大小', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          const option = instance.setOption.mock.calls[0][0];
          const nodes = option.series[0].data;

          // 验证节点大小基于 influenceScore
          expect(nodes[0].symbolSize).toBeGreaterThan(nodes[1].symbolSize);
          expect(nodes[1].symbolSize).toBeGreaterThan(nodes[2].symbolSize);
        },
        { timeout: 3000 }
      );
    });

    it('应该根据影响力等级设置节点颜色', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          const option = instance.setOption.mock.calls[0][0];
          const nodes = option.series[0].data;

          // 高影响力节点 (≥7) 应该是金色
          expect(nodes[0].itemStyle.color).toContain('251, 191, 36');
          // 中影响力节点 (4-7) 应该是蓝色
          expect(nodes[1].itemStyle.color).toContain('96, 165, 250');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('4. 显示 Top 影响力用户', () => {
    it('应该显示 Top 10 影响力用户列表', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('用户1')).toBeTruthy();
        expect(screen.getByText('用户2')).toBeTruthy();
      });
    });

    it('应该显示用户的影响力得分', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('9.50')).toBeTruthy();
        expect(screen.getByText('7.20')).toBeTruthy();
      });
    });
  });

  describe('5. 显示网络统计信息', () => {
    it('应该显示节点数', async () => {
      const { container } = render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          // 查找包含"节点数:"的元素，然后检查其兄弟元素
          const nodeCountLabel = Array.from(container.querySelectorAll('span')).find(
            el => el.textContent === '节点数:'
          );
          expect(nodeCountLabel).toBeTruthy();
          const nodeCountValue = nodeCountLabel?.nextElementSibling;
          expect(nodeCountValue?.textContent).toBe('3');
        },
        { timeout: 3000 }
      );
    });

    it('应该显示边数', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        const edgeCounts = screen.getAllByText('3');
        expect(edgeCounts.length).toBeGreaterThan(0);
      });
    });

    it('应该显示平均度数', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('2.00')).toBeTruthy();
      });
    });

    it('应该显示网络密度', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('50.0%')).toBeTruthy();
      });
    });
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
      render(
        <NetworkCentralityGraph
          data={{
            nodes: [],
            edges: [],
            networkStats: {
              nodeCount: 0,
              edgeCount: 0,
              avgDegree: 0,
              maxDegree: 0,
              density: 0,
            },
            topInfluencers: [],
          }}
        />
      );

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
