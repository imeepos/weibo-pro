import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpreadBreadth } from './useSpreadBreadth';
import { root } from '@sker/core';
import type { SpreadBreadthAnalysis } from '@sker/sdk';

const mockData: SpreadBreadthAnalysis = {
  totalReposts: 100,
  uniqueReposters: 80,
  spreadDepth: 5,
  spreadWidth: 4.5,
  breadthIndex: 0.75,
  propagationPaths: [],
  spreadTimeline: [],
  repostByUserType: [],
};

class MockSpreadBreadthController {
  async getAnalysis(_eventId: string): Promise<SpreadBreadthAnalysis> {
    return mockData;
  }
}

describe('useSpreadBreadth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(root, 'get').mockReturnValue(new MockSpreadBreadthController() as any);
  });

  it('应该正常获取数据', async () => {
    const { result } = renderHook(() => useSpreadBreadth('event-123'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('应该处理加载状态', async () => {
    const { result } = renderHook(() => useSpreadBreadth('event-123'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('应该处理错误', async () => {
    vi.spyOn(root, 'get').mockReturnValue({
      getAnalysis: vi.fn().mockRejectedValue(new Error('API Error')),
    } as any);

    const { result } = renderHook(() => useSpreadBreadth('event-123'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('API Error');
    });
  });
});
