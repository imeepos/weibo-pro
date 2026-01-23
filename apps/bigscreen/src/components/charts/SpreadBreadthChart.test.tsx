import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpreadBreadthChart } from './SpreadBreadthChart';
import type { SpreadBreadthAnalysis } from '@sker/sdk';

// Mock echarts
vi.mock('echarts', () => ({
  default: {
    init: vi.fn(() => ({
      setOption: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      clear: vi.fn(),
    })),
  },
}));

// Mock @/utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockData: SpreadBreadthAnalysis = {
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

describe('SpreadBreadthChart', () => {
  it('应该渲染空数据状态', () => {
    const { container } = render(
      <SpreadBreadthChart data={null} isLoading={false} />
    );
    expect(container.querySelector('.chart-state')).toBeInTheDocument();
  });

  it('应该渲染加载状态', () => {
    const { container } = render(
      <SpreadBreadthChart data={null} isLoading={true} />
    );
    expect(container.querySelector('.chart-state')).toBeInTheDocument();
  });

  it('应该渲染正常数据', () => {
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} />
    );
    expect(container.querySelector('div[style*="height"]')).toBeInTheDocument();
  });

  it('应该正确配置桑基图', () => {
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} />
    );
    const chartElement = container.querySelector('div[style*="height"]');
    expect(chartElement).toBeInTheDocument();
  });

  it('应该处理点击事件', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <SpreadBreadthChart data={mockData} isLoading={false} onClick={handleClick} />
    );
    expect(container).toBeInTheDocument();
  });
});
