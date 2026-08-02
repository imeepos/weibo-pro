import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommunityGraph from './CommunityGraph';
import type { CommunityAnalysis } from '@sker/sdk';
import * as echarts from 'echarts';

// Mock ECharts
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
    __mockChartInstance: mockChartInstance,
  };
});

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

const mockData: CommunityAnalysis = {
  communities: [
    {
      id: 'community-0',
      name: 'Community 1',
      members: [
        { userId: 'user1', screenName: '用户1', role: 'leader', inDegree: 5, outDegree: 3 },
        { userId: 'user2', screenName: '用户2', role: 'active', inDegree: 3, outDegree: 2 },
      ],
      size: 10,
      density: 0.8,
      avgInfluence: 0.75,
      topKeywords: ['关键词1', '关键词2'],
      sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
    },
    {
      id: 'community-1',
      name: 'Community 2',
      members: [
        { userId: 'user3', screenName: '用户3', role: 'leader', inDegree: 4, outDegree: 2 },
      ],
      size: 5,
      density: 0.6,
      avgInfluence: 0.65,
      topKeywords: ['关键词3'],
      sentiment: { positive: 0.4, negative: 0.3, neutral: 0.3 },
    },
  ],
  modularity: 0.75,
  totalCommunities: 2,
  interCommunityLinks: [
    { sourceCommunity: 'community-0', targetCommunity: 'community-1', weight: 5 },
  ],
  bridgeUsers: [
    {
      userId: 'user1',
      screenName: '用户1',
      communities: ['community-0', 'community-1'],
      bridgeScore: 0.8,
    },
  ],
};

describe('CommunityGraph', () => {
  let mockResizeObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mockInstance = getMockChartInstance();
    mockInstance.setOption.mockClear();
    mockInstance.on.mockClear();
    mockInstance.off.mockClear();
    mockInstance.resize.mockClear();
    mockInstance.dispose.mockClear();
    (echarts.init as any).mockClear();

    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();

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
      const { container } = render(<CommunityGraph data={mockData} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('应该渲染图表容器', async () => {
      const { container } = render(<CommunityGraph data={mockData} />);
      await waitFor(() => {
        const chartContainer = container.querySelector('div');
        expect(chartContainer).toBeTruthy();
      });
    });
  });

  describe('2. 社区节点显示', () => {
    it('应该初始化 ECharts 实例', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          expect(instance.setOption).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('应该设置正确的图表配置', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        expect(instance.setOption).toHaveBeenCalled();
        const option = instance.setOption.mock.calls[0][0];
        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('graph');
        expect(option.series[0].layout).toBe('force');
      });
    });

    it('应该按社区分组节点', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const _nodes = option.series[0].data;

        // 应该有 2 个社区
        expect(option.series[0].categories).toHaveLength(2);
      });
    });
  });

  describe('3. 桥接用户高亮', () => {
    it('应该高亮显示桥接用户', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          const option = instance.setOption.mock.calls[0][0];
          const nodes = option.series[0].data;

          // 桥接用户应该有特殊样式
          const bridgeUserNode = nodes.find((n: any) => n.name === '用户1');
          expect(bridgeUserNode).toBeDefined();
          // 桥接用户应该有特殊标记
          expect(bridgeUserNode.symbolSize).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('4. 社区信息面板', () => {
    it('应该显示社区数量', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeTruthy();
      });
    });

    it('应该显示模块度', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('0.75')).toBeTruthy();
      });
    });
  });

  describe('5. 交互功能', () => {
    it('应该触发节点点击事件', async () => {
      const handleClick = vi.fn();
      render(<CommunityGraph data={mockData} onClick={handleClick} />);

      await waitFor(() => {
        expect(getMockChartInstance().on).toHaveBeenCalledWith('click', expect.any(Function));
      });
    });
  });

  describe('6. 图例显示', () => {
    it('应该显示社区图例', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];

        // 检查图例配置
        expect(option.legend).toBeDefined();
        expect(option.legend.data).toHaveLength(2);
        expect(option.legend.data[0].name).toBe('Community 1');
        expect(option.legend.data[1].name).toBe('Community 2');
      });
    });
  });

  describe('7. 空数据状态', () => {
    it('应该显示空数据状态', () => {
      render(<CommunityGraph data={null} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('暂无社区数据')).toBeTruthy();
    });

    it('应该在社区为空时显示空状态', () => {
      render(
        <CommunityGraph
          data={{
            communities: [],
            modularity: 0,
            totalCommunities: 0,
            interCommunityLinks: [],
            bridgeUsers: [],
          }}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });

  describe('8. 加载状态', () => {
    it('应该显示加载状态', () => {
      render(<CommunityGraph data={mockData} isLoading={true} />);

      expect(screen.getByTestId('loading-state')).toBeTruthy();
      expect(screen.getByText('加载中...')).toBeTruthy();
    });
  });

  describe('9. 错误状态', () => {
    it('应该显示错误状态', () => {
      const error = new Error('加载失败');
      render(<CommunityGraph data={mockData} error={error} />);

      expect(screen.getByTestId('error-state')).toBeTruthy();
      expect(screen.getByText('加载失败')).toBeTruthy();
    });
  });

  describe('10. 响应式布局', () => {
    it('应该在窗口大小变化时调用 resize', async () => {
      render(<CommunityGraph data={mockData} />);

      await waitFor(() => {
        expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      });

      const resizeCallback = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'resize'
      )[1];
      resizeCallback();

      await waitFor(() => {
        expect(getMockChartInstance().resize).toHaveBeenCalled();
      });
    });

    it('应该支持自定义高度', () => {
      const { container } = render(<CommunityGraph data={mockData} height={600} />);

      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer.style.height).toBe('600px');
    });
  });
});
