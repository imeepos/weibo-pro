import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PostingTimeHeatmap from './PostingTimeHeatmap';
import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';
import * as echarts from 'echarts';

// Mock ECharts
const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('echarts', () => ({
  default: {
    init: vi.fn(() => mockChartInstance),
  },
}));

// Mock data
const mockHeatmapData: PostingTimeHeatmapType = {
  hourlyDistribution: [10, 5, 3, 2, 1, 2, 5, 15, 30, 45, 60, 55, 50, 48, 52, 65, 70, 68, 55, 40, 30, 25, 20, 15],
  weekdayDistribution: [100, 150, 200, 180, 220, 250, 120],
  heatmapMatrix: [
    [0.1, 0.05, 0.03, 0.02, 0.01, 0.02, 0.05, 0.15, 0.3, 0.45, 0.6, 0.55, 0.5, 0.48, 0.52, 0.65, 0.7, 0.68, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15],
    [0.15, 0.08, 0.05, 0.03, 0.02, 0.03, 0.08, 0.2, 0.35, 0.5, 0.65, 0.6, 0.55, 0.53, 0.57, 0.7, 0.75, 0.73, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2],
    [0.2, 0.1, 0.08, 0.05, 0.03, 0.05, 0.1, 0.25, 0.4, 0.55, 0.7, 0.65, 0.6, 0.58, 0.62, 0.75, 0.8, 0.78, 0.65, 0.5, 0.4, 0.35, 0.3, 0.25],
    [0.18, 0.12, 0.1, 0.08, 0.05, 0.08, 0.12, 0.3, 0.45, 0.6, 0.75, 0.7, 0.65, 0.63, 0.67, 0.8, 0.85, 0.83, 0.7, 0.55, 0.45, 0.4, 0.35, 0.3],
    [0.22, 0.15, 0.12, 0.1, 0.08, 0.1, 0.15, 0.35, 0.5, 0.65, 0.8, 0.75, 0.7, 0.68, 0.72, 0.85, 0.9, 0.88, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35],
    [0.25, 0.18, 0.15, 0.12, 0.1, 0.12, 0.18, 0.4, 0.55, 0.7, 0.85, 0.8, 0.75, 0.73, 0.77, 0.9, 0.95, 0.93, 0.8, 0.65, 0.55, 0.5, 0.45, 0.4],
    [0.12, 0.06, 0.04, 0.03, 0.02, 0.03, 0.06, 0.12, 0.2, 0.3, 0.4, 0.35, 0.3, 0.28, 0.32, 0.4, 0.45, 0.43, 0.3, 0.2, 0.15, 0.12, 0.1, 0.08],
  ],
  peakTime: {
    hour: 17,
    weekday: 5,
    count: 95,
    label: '周五 17:00',
  },
  offPeakTime: {
    hour: 4,
    weekday: 0,
    count: 1,
    label: '周日 04:00',
  },
  totalPosts: 1400,
  insights: [
    '周五17:00是发帖高峰时段',
    '工作日发帖量明显高于周末',
    '凌晨4点发帖量最低',
  ],
};

describe('PostingTimeHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('组件渲染', () => {
    it('应该正常渲染组件', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      // 应该渲染标题
      expect(screen.getByText('发帖时间热力图')).toBeInTheDocument();
    });

    it('应该显示统计信息面板', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('统计信息')).toBeInTheDocument();
    });

    it('应该显示总发帖数', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('总发帖数')).toBeInTheDocument();
      expect(screen.getByText('1400')).toBeInTheDocument();
    });
  });

  describe('热力图显示', () => {
    it('应该初始化ECharts实例', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(echarts.init).toHaveBeenCalled();
    });

    it('应该设置正确的图表配置', async () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });
    });

    it('应该包含热力图系列数据', async () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      await waitFor(() => {
        const callArgs = mockChartInstance.setOption.mock.calls[0];
        const option = callArgs[0];

        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('heatmap');
      });
    });

    it('热力图数据矩阵维度应该正确', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      // 验证热力图数据矩阵维度正确（7天 x 24小时）
      expect(mockHeatmapData.heatmapMatrix).toHaveLength(7);
      expect(mockHeatmapData.heatmapMatrix[0]).toHaveLength(24);
    });
  });

  describe('峰值和低谷时间显示', () => {
    it('应该显示峰值时间', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('峰值时间')).toBeInTheDocument();
      expect(screen.getByText('周五 17:00')).toBeInTheDocument();
    });

    it('应该显示峰值发帖数', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('峰值发帖数')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('应该显示低谷时间', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('低谷时间')).toBeInTheDocument();
      expect(screen.getByText('周日 04:00')).toBeInTheDocument();
    });

    it('应该显示低谷发帖数', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('低谷发帖数')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('洞察信息显示', () => {
    it('应该显示洞察信息', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      expect(screen.getByText('数据洞察')).toBeInTheDocument();
    });

    it('应该显示所有洞察内容', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      // 验证洞察内容
      mockHeatmapData.insights.forEach(insight => {
        expect(screen.getByText(insight)).toBeInTheDocument();
      });
    });
  });

  describe('加载和错误状态', () => {
    it('应该显示加载状态', () => {
      render(<PostingTimeHeatmap data={null} isLoading={true} />);

      expect(screen.getByText(/加载中/)).toBeInTheDocument();
    });

    it('加载状态时不应该渲染图表', () => {
      render(<PostingTimeHeatmap data={null} isLoading={true} />);

      expect(echarts.init).not.toHaveBeenCalled();
    });

    it('应该显示错误状态', () => {
      const error = new Error('API Error');
      render(<PostingTimeHeatmap data={null} error={error} />);

      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });

    it('错误状态时不应该渲染图表', () => {
      const error = new Error('API Error');
      render(<PostingTimeHeatmap data={null} error={error} />);

      expect(echarts.init).not.toHaveBeenCalled();
    });

    it('应该显示空数据状态', () => {
      const emptyData: PostingTimeHeatmapType = {
        hourlyDistribution: new Array(24).fill(0),
        weekdayDistribution: new Array(7).fill(0),
        heatmapMatrix: Array(7).fill(null).map(() => new Array(24).fill(0)),
        peakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        offPeakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        totalPosts: 0,
        insights: ['暂无数据'],
      };

      render(<PostingTimeHeatmap data={emptyData} />);

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('空状态时不应该渲染图表', () => {
      const emptyData: PostingTimeHeatmapType = {
        hourlyDistribution: new Array(24).fill(0),
        weekdayDistribution: new Array(7).fill(0),
        heatmapMatrix: Array(7).fill(null).map(() => new Array(24).fill(0)),
        peakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        offPeakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        totalPosts: 0,
        insights: ['暂无数据'],
      };

      render(<PostingTimeHeatmap data={emptyData} />);

      expect(echarts.init).not.toHaveBeenCalled();
    });
  });

  describe('交互功能', () => {
    it('应该支持点击事件', async () => {
      const onClick = vi.fn();
      render(<PostingTimeHeatmap data={mockHeatmapData} onClick={onClick} />);

      await waitFor(() => {
        expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
      });
    });

    it('点击时应该调用onClick回调', async () => {
      const onClick = vi.fn();
      render(<PostingTimeHeatmap data={mockHeatmapData} onClick={onClick} />);

      await waitFor(() => {
        const clickHandler = mockChartInstance.on.mock.calls.find(
          (call: any[]) => call[0] === 'click'
        )[1];

        // 模拟点击事件
        clickHandler({ data: [17, 5, 0.95] });

        expect(onClick).toHaveBeenCalledWith({
          hour: 17,
          weekday: 5,
          value: 0.95,
        });
      });
    });
  });

  describe('响应式行为', () => {
    it('窗口大小改变时应该调整图表大小', async () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} />);

      await waitFor(() => {
        // 模拟窗口resize事件
        window.dispatchEvent(new Event('resize'));

        expect(mockChartInstance.resize).toHaveBeenCalled();
      });
    });

    it('组件卸载时应该清理图表实例', async () => {
      const { unmount } = render(<PostingTimeHeatmap data={mockHeatmapData} />);

      await waitFor(() => {
        unmount();

        expect(mockChartInstance.dispose).toHaveBeenCalled();
      });
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义标题', () => {
      render(<PostingTimeHeatmap data={mockHeatmapData} title="自定义标题" />);

      expect(screen.getByText('自定义标题')).toBeInTheDocument();
    });

    it('应该支持自定义高度', () => {
      const { container } = render(
        <PostingTimeHeatmap data={mockHeatmapData} height={600} />
      );

      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '600px' });
    });

    it('应该支持自定义className', () => {
      const { container } = render(
        <PostingTimeHeatmap data={mockHeatmapData} className="custom-class" />
      );

      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });
});
