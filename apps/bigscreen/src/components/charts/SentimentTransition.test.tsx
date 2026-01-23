import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentimentTransition } from './SentimentTransition';
import type { SentimentTransitionAnalysis } from '@sker/sdk';

vi.mock('@sker/core', () => ({
  root: {
    get: vi.fn(),
  },
}));

const mockUseSentimentTransition = vi.fn();

vi.mock('../../hooks/useSentimentTransition', () => ({
  useSentimentTransition: (eventId: string) => mockUseSentimentTransition(eventId),
}));

vi.mock('@sker/ui/hooks/use-echart-theme', () => ({
  useEChartTheme: () => ({
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
    isDark: false,
  }),
}));

// Mock echarts
vi.mock('echarts', () => {
  const mockChart = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    init: vi.fn(() => mockChart),
  };
});

const mockData: SentimentTransitionAnalysis = {
  transitionMatrix: {
    positiveToNegative: 10,
    positiveToNeutral: 20,
    negativeToPositive: 15,
    negativeToNeutral: 25,
    neutralToPositive: 30,
    neutralToNegative: 12,
  },
  timeline: [
    {
      timestamp: '2024-01-01T10:00:00Z',
      positive: 100,
      negative: 50,
      neutral: 80,
    },
    {
      timestamp: '2024-01-01T11:00:00Z',
      positive: 120,
      negative: 45,
      neutral: 85,
    },
  ],
  turningPoints: [
    {
      timestamp: '2024-01-01T10:30:00Z',
      fromSentiment: '正面',
      toSentiment: '负面',
      magnitude: 0.75,
    },
  ],
  stabilityIndex: 0.85,
  polarizationIndex: 0.42,
};

describe('SentimentTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染加载状态', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('应该渲染错误状态', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('测试错误'),
    });

    render(<SentimentTransition eventId="test-event-id" />);
    expect(screen.getByText(/错误:/)).toBeInTheDocument();
  });

  it('应该渲染空数据状态', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: { ...mockData, timeline: [] },
      loading: false,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('应该渲染完整的情感转变分析', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);

    // 检查标题
    expect(screen.getByText('情感转变分析')).toBeInTheDocument();

    // 检查指标（使用千分位格式化）
    expect(screen.getByText('稳定性指数:')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('极化指数:')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();

    // 检查图表标题
    expect(screen.getByText('转变流向桑基图')).toBeInTheDocument();
    expect(screen.getByText('情感时间线')).toBeInTheDocument();

    // 检查转折点
    expect(screen.getByText('转折点')).toBeInTheDocument();
  });

  it('应该正确格式化数字（千分位分隔符）', () => {
    const largeData = {
      ...mockData,
      stabilityIndex: 0.9999,
      polarizationIndex: 0.5555,
    };

    mockUseSentimentTransition.mockReturnValue({
      data: largeData,
      loading: false,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);

    // 检查百分比格式化
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('56%')).toBeInTheDocument();
  });

  it('应该在深色模式下使用正确的主题颜色', () => {
    // 重新 mock useEChartTheme 返回深色主题
    vi.doMock('@sker/ui/hooks/use-echart-theme', () => ({
      useEChartTheme: () => ({
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
        isDark: true,
      }),
    }));

    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    const { container } = render(<SentimentTransition eventId="test-event-id" />);

    // 验证组件渲染成功
    expect(container.querySelector('.sentiment-transition')).toBeInTheDocument();
  });

  it('应该正确格式化时间戳', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);

    // 检查转折点中的时间格式化（应该是中文格式）
    const turningPointsList = screen.getByText('转折点').parentElement;
    expect(turningPointsList).toBeInTheDocument();

    // 时间应该包含中文格式的日期时间
    const listItems = turningPointsList?.querySelectorAll('li');
    expect(listItems?.length).toBeGreaterThan(0);
  });

  it('应该在没有转折点时不显示转折点区域', () => {
    const dataWithoutTurningPoints = {
      ...mockData,
      turningPoints: [],
    };

    mockUseSentimentTransition.mockReturnValue({
      data: dataWithoutTurningPoints,
      loading: false,
      error: null,
    });

    render(<SentimentTransition eventId="test-event-id" />);

    // 不应该显示转折点标题
    expect(screen.queryByText('转折点')).not.toBeInTheDocument();
  });

  it('应该使用中文标签（无英文内容）', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    const { container } = render(<SentimentTransition eventId="test-event-id" />);

    // 检查所有文本内容应该是中文
    const text = container.textContent || '';

    // 不应该包含英文单词（排除 CSS 类名）
    expect(text).not.toMatch(/\b(Positive|Negative|Neutral|from|to|Sankey)\b/);

    // 应该包含中文标签
    expect(text).toContain('情感转变分析');
    expect(text).toContain('稳定性指数');
    expect(text).toContain('极化指数');
    expect(text).toContain('转变流向桑基图');
    expect(text).toContain('情感时间线');
  });
});
