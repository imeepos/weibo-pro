import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CommentThreadTree } from './CommentThreadTree';
import type { CommentDepthAnalysis } from '@sker/sdk';
import * as echarts from 'echarts';

// Mock ECharts - 必须在顶层且直接返回对象
vi.mock('echarts', () => {
  const mockChartInstance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    default: {
      init: vi.fn(() => mockChartInstance),
    },
    graphic: {
      LinearGradient: vi.fn(),
    },
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
});
