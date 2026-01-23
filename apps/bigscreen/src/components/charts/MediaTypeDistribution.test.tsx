import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MediaTypeDistribution from './MediaTypeDistribution';
import type { MediaTypeAnalysis } from '@sker/sdk';
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

const mockData: MediaTypeAnalysis = {
  distribution: [
    {
      type: 'text',
      count: 100,
      percentage: 40,
      avgEngagement: 25,
    },
    {
      type: 'image',
      count: 75,
      percentage: 30,
      avgEngagement: 35,
    },
    {
      type: 'video',
      count: 50,
      percentage: 20,
      avgEngagement: 50,
    },
    {
      type: 'link',
      count: 15,
      percentage: 6,
      avgEngagement: 20,
    },
    {
      type: 'mixed',
      count: 10,
      percentage: 4,
      avgEngagement: 45,
    },
  ],
  totalPosts: 250,
  trend: [
    {
      timestamp: '2024-01-01T10:00:00Z',
      types: {
        text: 10,
        image: 8,
        video: 5,
        link: 2,
        mixed: 1,
      },
    },
    {
      timestamp: '2024-01-01T11:00:00Z',
      types: {
        text: 15,
        image: 12,
        video: 8,
        link: 3,
        mixed: 2,
      },
    },
  ],
  engagementByType: [
    {
      type: 'text',
      avgLikes: 10,
      avgComments: 5,
      avgReposts: 2,
    },
    {
      type: 'image',
      avgLikes: 15,
      avgComments: 8,
      avgReposts: 3,
    },
    {
      type: 'video',
      avgLikes: 25,
      avgComments: 12,
      avgReposts: 5,
    },
  ],
};

describe('MediaTypeDistribution', () => {
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
        <MediaTypeDistribution data={mockData} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该渲染图表容器', async () => {
      const { container } = render(
        <MediaTypeDistribution data={mockData} />
      );
      await waitFor(() => {
        const chartContainer = container.querySelector('div');
        expect(chartContainer).toBeTruthy();
      });
    });
  });

  describe('2. 环形图显示正确', () => {
    it('应该初始化 ECharts 实例', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          expect(instance.setOption).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('应该设置正确的图表配置', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        expect(instance.setOption).toHaveBeenCalled();
        const option = instance.setOption.mock.calls[0][0];
        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('pie');
        expect(option.series[0].radius).toEqual(['40%', '70%']); // 环形图
      });
    });

    it('应该显示所有媒体类型', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const data = option.series[0].data;

        expect(data).toHaveLength(5);
        // 数据名称包含百分比
        expect(data[0].name).toContain('纯文本');
        expect(data[1].name).toContain('图片');
        expect(data[2].name).toContain('视频');
        expect(data[3].name).toContain('链接');
        expect(data[4].name).toContain('混合');
      });
    });
  });

  describe('3. 数据映射正确', () => {
    it('应该正确映射媒体类型数据', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const data = option.series[0].data;

        expect(data[0].value).toBe(100); // text count
        expect(data[1].value).toBe(75);  // image count
        expect(data[2].value).toBe(50);  // video count
        expect(data[3].value).toBe(15);  // link count
        expect(data[4].value).toBe(10);  // mixed count
      });
    });

    it('应该在数据名称中显示百分比', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        const data = option.series[0].data;

        // 验证 data 名称中包含百分比
        expect(data[0].name).toContain('40.0%');
        expect(data[1].name).toContain('30.0%');
      });
    });
  });

  describe('4. 显示统计信息', () => {
    it('应该在标题中显示总帖子数', async () => {
      render(<MediaTypeDistribution data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        const option = instance.setOption.mock.calls[0][0];
        expect(option.title.text).toContain('250');
      });
    });
  });

  describe('5. 空数据状态', () => {
    it('应该显示空数据状态', () => {
      render(<MediaTypeDistribution data={null} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('暂无媒体类型数据')).toBeTruthy();
    });

    it('应该在分布为空时显示空状态', () => {
      render(
        <MediaTypeDistribution
          data={{
            distribution: [],
            totalPosts: 0,
            trend: [],
            engagementByType: [],
          }}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });

  describe('6. 加载状态', () => {
    it('应该接受加载prop', () => {
      // 验证组件可以接受加载prop而不抛出错误
      expect(() => {
        render(<MediaTypeDistribution data={mockData} isLoading={true} />);
      }).not.toThrow();
    });
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
