import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SentimentTransition } from './SentimentTransition';
import type { SentimentTransitionAnalysis } from '@sker/sdk';

// 跨 vi.mock 工厂与测试体共享的可变状态
const { chartInstances, resizeObserverInstances } = vi.hoisted(() => ({
  chartInstances: [] as Array<{
    setOption: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  resizeObserverInstances: [] as Array<{
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@sker/core', () => ({
  root: { get: vi.fn() },
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

// 每个 echarts.init 返回一个独立的 chart spy，方便区分旧/新实例
vi.mock('echarts', () => ({
  init: vi.fn(() => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    chartInstances.push(chart);
    return chart;
  }),
}));

// jsdom 无原生 ResizeObserver，替换为可追踪实例的 mock
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: () => void) {
    resizeObserverInstances.push(this);
  }
}

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
    { timestamp: '2024-01-01T10:00:00Z', positive: 100, negative: 50, neutral: 80 },
    { timestamp: '2024-01-01T11:00:00Z', positive: 120, negative: 45, neutral: 85 },
  ],
  turningPoints: [
    {
      timestamp: '2024-01-01T10:30:00Z',
      fromSentiment: 'positive',
      toSentiment: 'negative',
      magnitude: 0.75,
    },
  ],
  stabilityIndex: 0.85,
  polarizationIndex: 0.42,
};

describe('SentimentTransition 内存泄漏', () => {
  beforeEach(() => {
    chartInstances.length = 0;
    resizeObserverInstances.length = 0;
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('卸载后应 dispose 所有 ECharts 实例并 disconnect 所有 ResizeObserver', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    const { unmount } = render(<SentimentTransition eventId="test-event-id" />);

    // 三个图表均已创建
    expect(chartInstances.length).toBe(3);
    expect(resizeObserverInstances.length).toBe(3);

    unmount();

    chartInstances.forEach((chart) => {
      expect(chart.dispose).toHaveBeenCalled();
    });
    resizeObserverInstances.forEach((observer) => {
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });

  it('rerender 传入新 data 后应先释放旧图表', () => {
    mockUseSentimentTransition.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
    });

    const { rerender } = render(<SentimentTransition eventId="test-event-id" />);
    expect(chartInstances.length).toBe(3);

    const newData: SentimentTransitionAnalysis = {
      ...mockData,
      stabilityIndex: 0.92,
    };
    mockUseSentimentTransition.mockReturnValue({
      data: newData,
      loading: false,
      error: null,
    });
    rerender(<SentimentTransition eventId="test-event-id" />);

    // 重新渲染后创建了新的图表
    expect(chartInstances.length).toBe(6);

    // 旧的 3 个图表实例均应被 dispose，且对应 ResizeObserver 断开
    chartInstances.slice(0, 3).forEach((chart) => {
      expect(chart.dispose).toHaveBeenCalled();
    });
    resizeObserverInstances.slice(0, 3).forEach((observer) => {
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });
});
