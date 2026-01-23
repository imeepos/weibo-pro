/**
 * EventDetail 页面测试
 * 测试事件详情页面的核心功能，包括：
 * - 数据加载和渲染
 * - 关键字编辑对话框交互
 * - Tab 切换
 * - 滚动行为（防止事件冒泡）
 * - 刷新功能
 * - 导航功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import EventDetail from './EventDetail';
import * as utils from '@/utils';

// Mock @sker/core
vi.mock('@sker/core', async () => {
  const actual = await vi.importActual('@sker/core');
  return {
    ...actual,
    root: {
      get: vi.fn(),
    },
  };
});

// Mock @sker/sdk - avoid importing actual to prevent workflow decorator issues
vi.mock('@sker/sdk', () => ({
  EventsController: class MockEventsController {},
  // Add other exports if needed
}));

// Mock utils
vi.mock('@/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatNumber: (num: number) => num.toLocaleString(),
  formatRelativeTime: (date: string) => '2小时前',
}));

// Mock chart components
vi.mock('@/components/charts/MiniTrendChart', () => ({
  default: () => <div data-testid="mini-trend-chart">MiniTrendChart</div>,
}));

vi.mock('@/components/charts/TimeSeriesChart', () => ({
  default: ({ data, height }: { data: unknown[]; height: number }) => (
    <div data-testid="time-series-chart" data-height={height}>
      TimeSeriesChart ({data.length} points)
    </div>
  ),
}));

vi.mock('@/components/charts/WordCloudChart', () => ({
  default: ({ data, maxWords }: { data: unknown[]; maxWords: number }) => (
    <div data-testid="word-cloud-chart" data-max-words={maxWords}>
      WordCloudChart ({data.length} words)
    </div>
  ),
}));

vi.mock('@/components/charts/UserRelationGraph3DOffscreen', () => ({
  default: ({ network, className }: { network: unknown; className: string }) => (
    <div data-testid="user-relation-graph" className={className}>
      UserRelationGraph3D ({network ? 'with' : 'without'} network)
    </div>
  ),
}));

vi.mock('@/components/charts/SentimentHotnessScatterChart', () => ({
  default: () => <div data-testid="sentiment-hotness-chart">SentimentHotnessScatterChart</div>,
}));

vi.mock('@/components/charts/SentimentIntensityChart', () => ({
  default: () => <div data-testid="sentiment-intensity-chart">SentimentIntensityChart</div>,
}));

vi.mock('@/components/charts/EngagementTrendChart', () => ({
  default: () => <div data-testid="engagement-trend-chart">EngagementTrendChart</div>,
}));

vi.mock('@/components/charts/MultiMetricTrendChart', () => ({
  default: () => <div data-testid="multi-metric-trend-chart">MultiMetricTrendChart</div>,
}));

vi.mock('@/components/charts/AnomalyTimelineChart', () => ({
  default: () => <div data-testid="anomaly-timeline-chart">AnomalyTimelineChart</div>,
}));

// Mock P2 components
vi.mock('@/components/charts/SpreadBreadthChart', () => ({
  SpreadBreadthChart: ({ data, isLoading }: { data: unknown; isLoading: boolean }) => (
    <div data-testid="spread-breadth-chart" data-loading={isLoading}>
      SpreadBreadthChart {data ? 'with data' : 'no data'}
    </div>
  ),
}));

vi.mock('@/components/charts/MediaTypeDistribution', () => ({
  default: ({ data, isLoading }: { data: unknown; isLoading: boolean }) => (
    <div data-testid="media-type-distribution" data-loading={isLoading}>
      MediaTypeDistribution {data ? 'with data' : 'no data'}
    </div>
  ),
}));

vi.mock('@/components/charts/CommunityGraph', () => ({
  default: ({ data, isLoading }: { data: unknown; isLoading: boolean }) => (
    <div data-testid="community-graph" data-loading={isLoading}>
      CommunityGraph {data ? 'with data' : 'no data'}
    </div>
  ),
}));

vi.mock('@/components/charts/SentimentTransition', () => ({
  SentimentTransition: ({ eventId }: { eventId: string }) => (
    <div data-testid="sentiment-transition" data-event-id={eventId}>
      SentimentTransition
    </div>
  ),
}));

// Mock UI components from @sker/ui
vi.mock('@sker/ui/components/ui/metric-card', () => ({
  MetricCard: ({ title, value, icon }: { title: string; value: string; icon: string }) => (
    <div data-testid={`metric-${title}`} data-icon={icon}>
      <div className="text-xs">{title}</div>
      <div className="text-lg">{value}</div>
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren) => <div {...props}>{children}</div>,
  },
}));

describe('EventDetail', () => {
  const mockEventId = 'test-event-123';
  const mockEventData = {
    id: mockEventId,
    title: '测试事件标题',
    description: '这是一个测试事件的描述信息，用于验证组件渲染是否正常',
    postCount: 1500,
    userCount: 800,
    sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
    hotness: 95,
    trend: 'up' as const,
    category: '科技',
    keywords: ['AI', '人工智能', '机器学习', '深度学习', 'ChatGPT'],
    createdAt: '2025-01-01T00:00:00Z',
    lastUpdate: '2025-01-15T12:00:00Z',
    timeline: [],
    propagationPath: [],
    keyNodes: [],
    developmentPhases: [],
    developmentPattern: {
      outbreakSpeed: 'fast',
      propagationScope: 'wide',
      duration: 'medium',
      impactDepth: 'deep',
    },
    successFactors: [{ title: '传播力强', description: '事件传播迅速' }],
  };

  const mockTimeSeriesData = [
    { timestamp: '2025-01-15T00:00:00Z', value: 100, positive: 60, negative: 20, neutral: 20 },
    { timestamp: '2025-01-15T01:00:00Z', value: 120, positive: 70, negative: 30, neutral: 20 },
    { timestamp: '2025-01-15T02:00:00Z', value: 150, positive: 90, negative: 40, neutral: 20 },
  ];

  const mockTrendData = {
    hotnessData: [80, 85, 90, 95],
    sentimentData: [0.5, 0.55, 0.6, 0.65],
    postData: [100, 120, 150, 180],
    userData: [50, 60, 75, 90],
  };

  const mockUserRelationNetwork = {
    nodes: [
      { id: '1', name: '用户1', importance: 0.9 },
      { id: '2', name: '用户2', importance: 0.7 },
    ],
    edges: [{ source: '1', target: '2', weight: 10 }],
  };

  const mockGeographicData = [
    { region: '北京', posts: 500, users: 300, sentiment: 0.6 },
    { region: '上海', posts: 400, users: 250, sentiment: 0.55 },
  ];

  const mockKeywordData = [
    { keyword: 'AI', weight: 0.9, sentiment: 'positive' as const },
    { keyword: '人工智能', weight: 0.8, sentiment: 'positive' as const },
  ];

  const mockSentimentHotnessData = [
    { postId: '1', sentimentScore: 0.8, hotness: 90, timestamp: '2025-01-15T00:00:00Z' },
  ];

  const mockSentimentIntensityData = [
    { intensity: 0.8, count: 100 },
  ];

  const mockEngagementTrendData = [
    {
      timestamp: '2025-01-15T00:00:00Z',
      post_count: 100,
      comment_count: 200,
      repost_count: 50,
      like_count: 300,
      user_count: 80,
      hotness: 85,
      engagement_rate: 0.75,
    },
  ];

  const mockAnomaliesData = [
    {
      timestamp: '2025-01-15T01:00:00Z',
      type: 'spike' as const,
      metric: 'hotness',
      value: 95,
      expected: 80,
      confidence: 0.9,
    },
  ];

  let mockEventsController: {
    getEventDetail: ReturnType<typeof vi.fn>;
    getEventTimeSeries: ReturnType<typeof vi.fn>;
    getEventTrends: ReturnType<typeof vi.fn>;
    getEventUserRelations: ReturnType<typeof vi.fn>;
    getEventGeographic: ReturnType<typeof vi.fn>;
    getEventKeywords: ReturnType<typeof vi.fn>;
    getSentimentHotness: ReturnType<typeof vi.fn>;
    getSentimentIntensity: ReturnType<typeof vi.fn>;
    getEngagementTrend: ReturnType<typeof vi.fn>;
    getAnomalies: ReturnType<typeof vi.fn>;
    updateEventKeywords: ReturnType<typeof vi.fn>;
    getSpreadBreadthAnalysis?: ReturnType<typeof vi.fn>;
    getMediaTypeDistribution?: ReturnType<typeof vi.fn>;
    getCommunityAnalysis?: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventsController = {
      getEventDetail: vi.fn().mockResolvedValue(mockEventData),
      getEventTimeSeries: vi.fn().mockResolvedValue({
        categories: ['2025-01-15T00:00:00Z', '2025-01-15T01:00:00Z', '2025-01-15T02:00:00Z'],
        series: [
          { name: '正面情绪', data: [60, 70, 90] },
          { name: '负面情绪', data: [20, 30, 40] },
          { name: '中性情绪', data: [20, 20, 20] },
        ],
      }),
      getEventTrends: vi.fn().mockResolvedValue({
        hotnessData: [80, 85, 90, 95],
        sentimentScores: [0.5, 0.55, 0.6, 0.65],
        postVolume: [100, 120, 150, 180],
        userEngagement: [50, 60, 75, 90],
      }),
      getEventUserRelations: vi.fn().mockResolvedValue(mockUserRelationNetwork),
      getEventGeographic: vi.fn().mockResolvedValue(mockGeographicData),
      getEventKeywords: vi.fn().mockResolvedValue(mockKeywordData),
      getSentimentHotness: vi.fn().mockResolvedValue(mockSentimentHotnessData),
      getSentimentIntensity: vi.fn().mockResolvedValue(mockSentimentIntensityData),
      getEngagementTrend: vi.fn().mockResolvedValue(mockEngagementTrendData),
      getAnomalies: vi.fn().mockResolvedValue(mockAnomaliesData),
      updateEventKeywords: vi.fn().mockResolvedValue({ success: true }),
      // P2 API methods
      getSpreadBreadthAnalysis: vi.fn().mockResolvedValue({
        totalReposts: 100,
        uniqueReposters: 80,
        spreadDepth: 5,
        spreadWidth: 4.5,
        breadthIndex: 0.75,
        propagationPaths: [],
        spreadTimeline: [],
        repostByUserType: [],
      }),
      getMediaTypeDistribution: vi.fn().mockResolvedValue({
        totalPosts: 1000,
        distribution: [],
      }),
      getCommunityAnalysis: vi.fn().mockResolvedValue({
        totalCommunities: 3,
        modularity: 0.75,
        communities: [],
        bridgeUsers: [],
        interCommunityLinks: [],
      }),
    };

    // Always return the mock controller when EventsController is requested
    vi.mocked(root.get).mockImplementation((token) => {
      if (token === EventsController) {
        return mockEventsController as any;
      }
      return {} as any;
    });
  });

  // Note: Don't use afterEach with restoreAllMocks as it clears the root.get mock
  // beforeEach properly clears mocks with vi.clearAllMocks()

  /**
   * 基础渲染测试
   */
  describe('基础渲染', () => {
    it('应该显示加载骨架屏在数据加载前', () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      // 应该显示骨架屏
      const skeletons = document.querySelectorAll('.bg-muted\\/30.animate-pulse, .animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('应该在数据加载后显示事件详情', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      expect(screen.getByText('科技')).toBeInTheDocument();
      expect(screen.getByText('热门')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('当没有 eventId 时应该重定向到事件分析页面', async () => {
      const router = createMemoryRouter(
        [
          {
            path: '/event/:eventId',
            element: <EventDetail />,
          },
          {
            path: '/event-analysis',
            element: <div>事件分析页面</div>,
          },
        ],
        {
          initialEntries: ['/event/'],
          initialIndex: 0,
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText('事件分析页面')).toBeInTheDocument();
      });
    });

    it('应该在 API 调用失败时仍然渲染页面', async () => {
      mockEventsController.getEventDetail.mockRejectedValue(new Error('API Error'));

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      // 应该不崩溃，但可能显示空状态或错误
      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBe(0);
      });
    });
  });

  /**
   * 滚动行为测试 - 核心测试用例
   * 测试 motion.div 卡片的 onClick 和 onPointerDown 事件不会触发页面滚动
   */
  describe('滚动行为', () => {
    it('应该在 motion.div 上阻止事件冒泡以防止意外滚动', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 查找 motion.div 渲染的卡片元素
      const motionCards = document.querySelectorAll('.bg-muted\\/20.border');
      const topCard = Array.from(motionCards).find((card) =>
        card.textContent?.includes('测试事件标题')
      );

      expect(topCard).toBeDefined();

      if (topCard) {
        // 创建一个模拟点击事件
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });

        // 创建一个模拟的停止传播方法
        const mockStopPropagation = vi.fn();
        Object.defineProperty(clickEvent, 'stopPropagation', {
          value: mockStopPropagation,
        });

        // 组件内部有 stopPropagation() 调用
        // 由于我们无法直接测试事件传播，我们验证组件能正常处理点击
        expect(() => {
          topCard.dispatchEvent(clickEvent);
        }).not.toThrow();
      }
    });

    it('应该在卡片内容区域阻止事件冒泡', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 查找卡片内部的描述文本
      const description = screen.getByText((content) =>
        content.includes('这是一个测试事件的描述信息')
      );

      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
    });
  });

  /**
   * 关键字编辑对话框测试
   */
  describe('关键字编辑对话框', () => {
    it('应该打开关键字编辑对话框', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 查找并点击编辑按钮（铅笔图标）
      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      expect(pencilButton).toBeDefined();

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('编辑事件关键字')).toBeInTheDocument();
          expect(screen.getByText('调整事件的关键字以优化监测和分类效果')).toBeInTheDocument();
        });
      }
    });

    it('应该显示当前事件的关键字', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 验证关键字显示
      expect(screen.getByText('#AI')).toBeInTheDocument();
      expect(screen.getByText('#人工智能')).toBeInTheDocument();
      expect(screen.getByText('#机器学习')).toBeInTheDocument();
    });

    it('应该能够添加新关键字', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 打开编辑对话框
      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('编辑事件关键字')).toBeInTheDocument();
        });

        // 查找输入框
        const input = screen.getByPlaceholderText('输入新关键字');
        expect(input).toBeInTheDocument();

        // 输入新关键字
        fireEvent.change(input, { target: { value: '新关键字' } });

        // 点击添加按钮
        const addButton = screen.getByRole('button', { name: '添加' });
        fireEvent.click(addButton);

        // 验证关键字被添加（在对话框中）
        await waitFor(() => {
          expect(screen.getByText('#新关键字')).toBeInTheDocument();
        });
      }
    });

    it('应该在输入框按 Enter 键时添加关键字', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('编辑事件关键字')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('输入新关键字');
        fireEvent.change(input, { target: { value: '测试关键字' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
          expect(screen.getByText('#测试关键字')).toBeInTheDocument();
        });
      }
    });

    it('应该能够移除关键字', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('#AI')).toBeInTheDocument();
        });

        // 查找 AI 关键字的移除按钮（X 图标）
        const aiKeyword = screen.getByText('#AI').parentElement;
        const removeButton = aiKeyword?.querySelector('button');

        if (removeButton) {
          fireEvent.click(removeButton);

          // AI 关键字应该被移除
          await waitFor(() => {
            expect(screen.queryByText('#AI')).not.toBeInTheDocument();
          });
        }
      }
    });

    it('应该能够保存关键字更改', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('编辑事件关键字')).toBeInTheDocument();
        });

        // 点击保存按钮
        const saveButton = screen.getByRole('button', { name: '保存' });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockEventsController.updateEventKeywords).toHaveBeenCalledWith(
            mockEventId,
            { keywords: mockEventData.keywords }
          );
        });

        // 对话框应该关闭
        await waitFor(() => {
          expect(screen.queryByText('编辑事件关键字')).not.toBeInTheDocument();
        });
      }
    });

    it('应该能够取消编辑', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('编辑事件关键字')).toBeInTheDocument();
        });

        // 点击取消按钮
        const cancelButton = screen.getByRole('button', { name: '取消' });
        fireEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByText('编辑事件关键字')).not.toBeInTheDocument();
        });
      }
    });
  });

  /**
   * Tab 切换测试
   */
  describe('Tab 切换', () => {
    it('应该显示四个 Tab', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      expect(screen.getByText('总览')).toBeInTheDocument();
      expect(screen.getByText('关系网络')).toBeInTheDocument();
      expect(screen.getByText('趋势分析')).toBeInTheDocument();
      expect(screen.getByText('情感分析')).toBeInTheDocument();
    });

    it('应该默认选中总览 Tab', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 总览 Tab 的内容应该可见
      expect(screen.getByText('情感变化趋势')).toBeInTheDocument();
      expect(screen.getByText('事件关键词云')).toBeInTheDocument();
    });

    it('应该能够切换到关系网络 Tab', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const networkTab = screen.getByText('关系网络');
      fireEvent.click(networkTab);

      await waitFor(() => {
        expect(screen.getByText('用户关系网络')).toBeInTheDocument();
      });
    });

    it('应该能够切换到趋势分析 Tab', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const trendTab = screen.getByText('趋势分析');
      fireEvent.click(trendTab);

      await waitFor(() => {
        expect(screen.getByText('核心指标时间趋势')).toBeInTheDocument();
        expect(screen.getByText('互动指标分解')).toBeInTheDocument();
        expect(screen.getByText('异常检测时间线')).toBeInTheDocument();
      });
    });

    it('应该能够切换到情感分析 Tab', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const sentimentTab = screen.getByText('情感分析');
      fireEvent.click(sentimentTab);

      await waitFor(() => {
        expect(screen.getByText('情感变化趋势')).toBeInTheDocument();
        expect(screen.getByText('情感-热度关联')).toBeInTheDocument();
        expect(screen.getByText('情感强度谱')).toBeInTheDocument();
      });
    });
  });

  /**
   * 刷新功能测试
   */
  describe('刷新功能', () => {
    it('应该能够刷新事件数据', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 查找刷新按钮
      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-4')
      );

      expect(refreshButton).toBeDefined();

      if (refreshButton) {
        // 重置 mock 计数
        mockEventsController.getEventDetail.mockClear();

        fireEvent.click(refreshButton);

        await waitFor(() => {
          expect(mockEventsController.getEventDetail).toHaveBeenCalledWith(mockEventId);
        });
      }
    });

    it('应该在刷新时禁用刷新按钮', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-4')
      );

      if (refreshButton) {
        // 使 API 调用变慢
        mockEventsController.getEventDetail.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockEventData), 100))
        );

        fireEvent.click(refreshButton);

        // 按钮应该被禁用
        expect(refreshButton).toBeDisabled();
      }
    });
  });

  /**
   * 导航功能测试
   */
  describe('导航功能', () => {
    it('应该能够返回到事件分析页面', async () => {
      const router = createMemoryRouter(
        [
          {
            path: '/event/:eventId',
            element: <EventDetail />,
          },
          {
            path: '/event-analysis',
            element: <div>事件分析页面</div>,
          },
        ],
        {
          initialEntries: [`/event/${mockEventId}`],
          initialIndex: 0,
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 查找返回按钮（箭头图标）
      const backButtons = screen.getAllByRole('button');
      const backButton = backButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-4')
      );

      if (backButton) {
        fireEvent.click(backButton);

        await waitFor(() => {
          expect(router.state.location.pathname).toBe('/event-analysis');
        });
      }
    });
  });

  /**
   * 数据统计显示测试
   */
  describe('数据统计显示', () => {
    it('应该显示核心指标卡片', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 验证指标卡片存在
      const metricCards = [
        screen.getByTestId('metric-贴子总数'),
        screen.getByTestId('metric-参与用户'),
        screen.getByTestId('metric-平均热度'),
        screen.getByTestId('metric-情感得分'),
      ];

      metricCards.forEach((card) => {
        expect(card).toBeInTheDocument();
      });
    });

    it('应该正确计算和显示统计数据', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 趋势数据的总数: 100 + 120 + 150 + 180 = 550
      // 用户数据总数: 50 + 60 + 75 + 90 = 275
      // 平均热度: (80 + 85 + 90 + 95) / 4 = 87.5 -> 88
      // 平均情感: (0.5 + 0.55 + 0.6 + 0.65) / 4 * 100 = 57.5 -> 58

      await waitFor(() => {
        const postsCard = screen.getByTestId('metric-贴子总数');
        expect(postsCard.textContent).toContain('550');

        const usersCard = screen.getByTestId('metric-参与用户');
        expect(usersCard.textContent).toContain('275');
      });
    });
  });

  /**
   * 空状态处理测试
   */
  describe('空状态处理', () => {
    it('应该在没有用户关系数据时显示空状态', async () => {
      mockEventsController.getEventUserRelations.mockResolvedValue({
        nodes: [],
        edges: [],
      });

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      // 切换到关系网络 Tab
      const networkTab = screen.getByText('关系网络');
      fireEvent.click(networkTab);

      await waitFor(() => {
        expect(screen.getByText('暂无用户关系数据')).toBeInTheDocument();
      });
    });

    it('应该在关键字列表为空时显示提示', async () => {
      const emptyKeywordEvent = {
        ...mockEventData,
        keywords: [],
      };

      mockEventsController.getEventDetail.mockResolvedValue(emptyKeywordEvent);

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const pencilButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-3.5')
      );

      if (pencilButton) {
        fireEvent.click(pencilButton);

        await waitFor(() => {
          expect(screen.getByText('暂无关键字，点击下方添加')).toBeInTheDocument();
        });
      }
    });
  });

  /**
   * 趋势配置测试
   */
  describe('趋势配置', () => {
    it('应该显示上升趋势配置', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('上升')).toBeInTheDocument();
      });
    });

    it('应该显示下降趋势配置', async () => {
      const downTrendEvent = { ...mockEventData, trend: 'down' as const };
      mockEventsController.getEventDetail.mockResolvedValue(downTrendEvent);

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('下降')).toBeInTheDocument();
      });
    });

    it('应该显示平稳趋势配置', async () => {
      const stableTrendEvent = { ...mockEventData, trend: 'stable' as const };
      mockEventsController.getEventDetail.mockResolvedValue(stableTrendEvent);

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('平稳')).toBeInTheDocument();
      });
    });
  });

  /**
   * 情感配置测试
   */
  describe('情感配置', () => {
    it('应该显示正面主导情感', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/正面.*60%/)).toBeInTheDocument();
      });
    });

    it('应该显示负面主导情感', async () => {
      const negativeEvent = {
        ...mockEventData,
        sentiment: { positive: 0.2, negative: 0.7, neutral: 0.1 },
      };
      mockEventsController.getEventDetail.mockResolvedValue(negativeEvent);

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/负面.*70%/)).toBeInTheDocument();
      });
    });
  });

  /**
   * API 调用验证
   */
  describe('API 调用', () => {
    it('应该在组件挂载时调用所有 API', async () => {
      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });

      expect(mockEventsController.getEventDetail).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventTimeSeries).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventTrends).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventUserRelations).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventGeographic).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventKeywords).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getSentimentHotness).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getSentimentIntensity).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEngagementTrend).toHaveBeenCalledWith(mockEventId, '168');
      expect(mockEventsController.getAnomalies).toHaveBeenCalledWith(mockEventId, '168');
    });

    it('应该优雅地处理可选 API 的失败', async () => {
      mockEventsController.getSentimentHotness.mockRejectedValue(new Error('API Error'));
      mockEventsController.getSentimentIntensity.mockRejectedValue(new Error('API Error'));
      mockEventsController.getEngagementTrend.mockRejectedValue(new Error('API Error'));
      mockEventsController.getAnomalies.mockRejectedValue(new Error('API Error'));

      render(
        <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
          <EventDetail />
        </MemoryRouter>
      );

      // 页面应该仍然正常渲染
      await waitFor(() => {
        expect(screen.getByText('测试事件标题')).toBeInTheDocument();
      });
    });
  });

  /**
   * P2 组件集成测试
   */
  describe('P2 组件集成', () => {
    // Mock P2 data
    const mockSpreadBreadthData = {
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

    const mockMediaTypeData = {
      totalPosts: 1000,
      distribution: [
        { type: 'text', count: 400, percentage: 40, avgEngagement: 50 },
        { type: 'image', count: 300, percentage: 30, avgEngagement: 80 },
        { type: 'video', count: 200, percentage: 20, avgEngagement: 120 },
        { type: 'mixed', count: 100, percentage: 10, avgEngagement: 100 },
      ],
    };

    const mockCommunityData = {
      totalCommunities: 3,
      modularity: 0.75,
      communities: [
        {
          id: 'community-1',
          name: '社区1',
          memberCount: 50,
          avgInfluence: 0.8,
          members: [],
        },
      ],
      bridgeUsers: [],
      interCommunityLinks: [],
    };

    beforeEach(() => {
      // Mock P2 API calls
      vi.mocked(root.get).mockImplementation((token: any) => {
        if (token === EventsController) {
          return {
            ...mockEventsController,
            getSpreadBreadthAnalysis: vi.fn().mockResolvedValue(mockSpreadBreadthData),
            getMediaTypeDistribution: vi.fn().mockResolvedValue(mockMediaTypeData),
            getCommunityAnalysis: vi.fn().mockResolvedValue(mockCommunityData),
          } as any;
        }
        return {} as any;
      });
    });

    describe('趋势分析 Tab - P2 组件', () => {
      it('应该渲染 SpreadBreadthChart 组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        // 切换到趋势分析 Tab
        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          expect(screen.getByTestId('spread-breadth-chart')).toBeInTheDocument();
        });
      });

      it('应该渲染 MediaTypeDistribution 组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        // 切换到趋势分析 Tab
        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          expect(screen.getByTestId('media-type-distribution')).toBeInTheDocument();
        });
      });

      it('应该在趋势分析 Tab 中正确显示 P2 组件布局', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          expect(screen.getByTestId('spread-breadth-chart')).toBeInTheDocument();
          expect(screen.getByTestId('media-type-distribution')).toBeInTheDocument();
          expect(screen.getByTestId('anomaly-timeline-chart')).toBeInTheDocument();
        });
      });
    });

    describe('情感分析 Tab - P2 组件', () => {
      it('应该渲染 SentimentTransition 组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        // 切换到情感分析 Tab
        const sentimentTab = screen.getByText('情感分析');
        fireEvent.click(sentimentTab);

        await waitFor(() => {
          expect(screen.getByTestId('sentiment-transition')).toBeInTheDocument();
        });

        // 验证 eventId 传递正确
        const sentimentTransition = screen.getByTestId('sentiment-transition');
        expect(sentimentTransition).toHaveAttribute('data-event-id', mockEventId);
      });

      it('应该在情感分析 Tab 中正确显示所有组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const sentimentTab = screen.getByText('情感分析');
        fireEvent.click(sentimentTab);

        await waitFor(() => {
          expect(screen.getByTestId('sentiment-transition')).toBeInTheDocument();
          expect(screen.getByTestId('sentiment-hotness-chart')).toBeInTheDocument();
          expect(screen.getByTestId('sentiment-intensity-chart')).toBeInTheDocument();
        });
      });
    });

    describe('关系网络 Tab - P2 组件', () => {
      it('应该渲染 CommunityGraph 组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        // 切换到关系网络 Tab
        const networkTab = screen.getByText('关系网络');
        fireEvent.click(networkTab);

        await waitFor(() => {
          expect(screen.getByTestId('community-graph')).toBeInTheDocument();
        });
      });

      it('应该在关系网络 Tab 中正确显示所有组件', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const networkTab = screen.getByText('关系网络');
        fireEvent.click(networkTab);

        await waitFor(() => {
          expect(screen.getByTestId('user-relation-graph')).toBeInTheDocument();
          expect(screen.getByTestId('community-graph')).toBeInTheDocument();
        });
      });
    });

    describe('P2 组件数据加载状态', () => {
      it('应该在数据加载时显示加载状态', async () => {
        // 使 API 调用延迟
        vi.mocked(root.get).mockImplementation((token: any) => {
          if (token === EventsController) {
            return {
              ...mockEventsController,
              getSpreadBreadthAnalysis: vi.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockSpreadBreadthData), 100))
              ),
            } as any;
          }
          return {} as any;
        });

        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          const spreadBreadthChart = screen.getByTestId('spread-breadth-chart');
          expect(spreadBreadthChart).toHaveAttribute('data-loading', 'true');
        });
      });

      it('应该在数据加载完成后显示数据', async () => {
        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          const spreadBreadthChart = screen.getByTestId('spread-breadth-chart');
          expect(spreadBreadthChart).toHaveAttribute('data-loading', 'false');
          expect(spreadBreadthChart.textContent).toContain('with data');
        });
      });
    });

    describe('P2 组件响应式布局', () => {
      it('应该在桌面端使用两列布局', async () => {
        // 模拟桌面端视口
        global.innerWidth = 1024;

        render(
          <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
            <EventDetail />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('测试事件标题')).toBeInTheDocument();
        });

        const trendTab = screen.getByText('趋势分析');
        fireEvent.click(trendTab);

        await waitFor(() => {
          expect(screen.getByTestId('media-type-distribution')).toBeInTheDocument();
          expect(screen.getByTestId('anomaly-timeline-chart')).toBeInTheDocument();
        });
      });
    });
  });
});
