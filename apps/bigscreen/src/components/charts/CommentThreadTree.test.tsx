/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CommentThreadTree } from './CommentThreadTree';
import type { CommentDepthAnalysis } from '@sker/sdk';
import * as echarts from 'echarts';

// Mock useEChartTheme hook - 必须在echarts mock之前
const mockColors = {
  text: '#ffffff',
  textMuted: '#9ca3af',
  border: 'rgba(255, 255, 255, 0.3)',
  splitLine: 'rgba(255, 255, 255, 0.1)',
  tooltipBg: 'rgba(0, 0, 0, 0.8)',
  tooltipBorder: 'rgba(255, 255, 255, 0.2)',
  toolbox: '#ffffff',
  emphasis: '#3b82f6',
  chartBg: '#1e293b',
};

vi.mock('@sker/ui/hooks/use-echart-theme', () => ({
  useEChartTheme: vi.fn(() => ({
    isDark: true,
    colors: mockColors,
  })),
}));

// Mock ECharts
const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('echarts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('echarts')>();
  return {
    ...actual,
    default: {
      ...actual,
      init: vi.fn(() => mockChartInstance),
    },
    init: vi.fn(() => mockChartInstance),
  };
});

// Mock data
const mockCommentDepthData: CommentDepthAnalysis = {
  avgThreadDepth: 2.5,
  maxThreadDepth: 5,
  replyRatio: 0.6,
  totalRootComments: 10,
  totalReplies: 15,
  depthDistribution: [
    { depth: 0, count: 3, percentage: 30 },
    { depth: 1, count: 4, percentage: 40 },
    { depth: 2, count: 2, percentage: 20 },
    { depth: 3, count: 1, percentage: 10 },
  ],
  discussionHotspots: [
    {
      rootCommentId: '1',
      rootCommentText: '热门讨论话题1',
      replyCount: 8,
      maxDepth: 4,
      participants: 6,
    },
    {
      rootCommentId: '2',
      rootCommentText: '热门讨论话题2',
      replyCount: 5,
      maxDepth: 3,
      participants: 4,
    },
  ],
};

describe('CommentThreadTree Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染测试', () => {
    it('1. 组件正常渲染', () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      expect(screen.getByText('评论深度分析')).toBeInTheDocument();
    });

    it('2. 树状图显示正确', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(echarts.init).toHaveBeenCalled();
      });
    });

    it('3. 显示深度分布统计', () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      expect(screen.getByText(/平均讨论深度/i)).toBeInTheDocument();
      expect(screen.getByText('2.50')).toBeInTheDocument();
    });

    it('4. 显示热门讨论', () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      expect(screen.getByText(/热门讨论/i)).toBeInTheDocument();
      expect(screen.getByText('热门讨论话题1')).toBeInTheDocument();
      expect(screen.getByText('热门讨论话题2')).toBeInTheDocument();
    });
  });

  describe('交互功能测试', () => {
    it('5. 展开/折叠交互', async () => {
      const onClick = vi.fn();
      render(<CommentThreadTree data={mockCommentDepthData} onClick={onClick} />);

      const hotspot = screen.getByText('热门讨论话题1');
      hotspot.click();

      // 应该调用onClick
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('状态处理测试', () => {
    it('6. 空数据状态', () => {
      const emptyData: CommentDepthAnalysis = {
        avgThreadDepth: 0,
        maxThreadDepth: 0,
        replyRatio: 0,
        totalRootComments: 0,
        totalReplies: 0,
        depthDistribution: [],
        discussionHotspots: [],
      };

      render(<CommentThreadTree data={emptyData} />);

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('7. 加载状态', () => {
      render(<CommentThreadTree data={null} isLoading={true} />);

      const loadingElement = screen.queryByText(/加载数据中/i);
      expect(loadingElement).toBeInTheDocument();
    });

    it('8. 错误状态', () => {
      const error = new Error('Network error');
      render(<CommentThreadTree data={null} error={error} />);

      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  describe('主题适配测试', () => {
    it('9. 使用useEChartTheme hook', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      // 验证ECharts配置使用了主题颜色
      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.title.textStyle.color).toBe(mockColors.text);
    });

    it('10. 图表标题使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.title.textStyle.color).toBe(mockColors.text);
    });

    it('11. X轴标签使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.xAxis.axisLabel.color).toBe(mockColors.textMuted);
    });

    it('12. Y轴标签使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.yAxis.axisLabel.color).toBe(mockColors.textMuted);
    });

    it('13. 分割线使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.yAxis.splitLine.lineStyle.color).toBe(mockColors.splitLine);
    });

    it('14. 轴线使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.xAxis.axisLine.lineStyle.color).toBe(mockColors.border);
      expect(chartOption.yAxis.axisLine.lineStyle.color).toBe(mockColors.border);
    });

    it('15. 柱状图标签使用主题颜色', async () => {
      render(<CommentThreadTree data={mockCommentDepthData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const chartOption = mockChartInstance.setOption.mock.calls[0][0];
      expect(chartOption.series[0].label.color).toBe(mockColors.text);
    });

    it('16. 统计卡片使用语义化CSS类', () => {
      const { container } = render(<CommentThreadTree data={mockCommentDepthData} />);

      // 验证统计卡片使用bg-card而不是bg-gray-800
      const cards = container.querySelectorAll('.bg-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('17. 统计卡片标签使用语义化CSS类', () => {
      const { container } = render(<CommentThreadTree data={mockCommentDepthData} />);

      // 验证标签使用text-muted-foreground
      const labels = container.querySelectorAll('.text-muted-foreground');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('18. 热门讨论标题使用语义化CSS类', () => {
      const { container } = render(<CommentThreadTree data={mockCommentDepthData} />);

      // 验证热门讨论标题使用text-foreground
      const title = container.querySelector('h3.text-foreground');
      expect(title).toBeInTheDocument();
    });
  });
});
