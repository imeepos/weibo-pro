import React from 'react';
import { vi } from 'vitest';
import * as echarts from 'echarts';
import type { CentralityAnalysis } from '@sker/sdk';

// 获取 mock 实例（echarts 由各测试文件负责 mock）
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
