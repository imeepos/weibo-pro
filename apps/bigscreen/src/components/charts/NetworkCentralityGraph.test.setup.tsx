import React from 'react';
import { vi } from 'vitest';
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

// 获取 mock 实例
export const getMockChartInstance = () => (echarts as any).__mockChartInstance;

export const mockData: CentralityAnalysis = {
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

export const emptyMockData: CentralityAnalysis = {
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
};

// 模拟窗口事件监听与 ResizeObserver
export function mockBrowserApis() {
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();

  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.ResizeObserver = mockResizeObserver as any;
}
