import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNetworkCentrality } from './useNetworkCentrality';
import { root } from '@sker/core';
import type { CentralityAnalysis } from '@sker/sdk';

// Mock data
const mockCentralityData: CentralityAnalysis = {
  nodes: [
    {
      userId: 'user1',
      screenName: 'User One',
      degreeCentrality: 0.8,
      weightedDegree: 100,
      influenceScore: 0.9,
      nodeSize: 45.5,
    },
  ],
  edges: [
    {
      source: 'user1',
      target: 'user2',
      weight: 10,
    },
  ],
  networkStats: {
    nodeCount: 10,
    edgeCount: 15,
    avgDegree: 3,
    maxDegree: 8,
    density: 0.3,
  },
  topInfluencers: [
    {
      userId: 'user1',
      screenName: 'User One',
      score: 0.9,
      rank: 1,
    },
  ],
};

// Mock controller
class MockNetworkCentralityController {
  async getAnalysis(_eventId: string): Promise<CentralityAnalysis> {
    return mockCentralityData;
  }
}

describe('useNetworkCentrality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册 mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockNetworkCentralityController() as any);
  });

  describe('基础功能', () => {
    it('应该正常获取数据', async () => {
      const { result } = renderHook(() => useNetworkCentrality('event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCentralityData);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('应该处理加载状态', async () => {
      // Mock a pending promise
      let resolveController: any;
      const pendingPromise = new Promise((resolve) => {
        resolveController = resolve;
      });

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockReturnValue(pendingPromise),
      } as any);

      const { result } = renderHook(() => useNetworkCentrality('event-123'));

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      resolveController(mockCentralityData);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('应该处理空数据', async () => {
      const emptyData: CentralityAnalysis = {
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

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockResolvedValue(emptyData),
      } as any);

      const { result } = renderHook(() => useNetworkCentrality('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.nodes).toEqual([]);
      expect(result.current.data?.networkStats.nodeCount).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理错误', async () => {
      const mockError = new Error('Network request failed');

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockRejectedValue(mockError),
      } as any);

      const { result } = renderHook(() => useNetworkCentrality('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeNull();
    });
  });

  describe('缓存和重新请求', () => {
    it('应该使用缓存', async () => {
      const mockController = new MockNetworkCentralityController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result } = renderHook(() => useNetworkCentrality('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getAnalysisSpy).toHaveBeenCalledTimes(1);
      expect(getAnalysisSpy).toHaveBeenCalledWith('event-123');
    });

    it('应该在参数变化时重新请求', async () => {
      const mockController = new MockNetworkCentralityController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result, rerender } = renderHook(
        ({ eventId }) => useNetworkCentrality(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getAnalysisSpy).toHaveBeenCalledTimes(1);

      // Change eventId
      rerender({ eventId: 'event-456' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getAnalysisSpy).toHaveBeenCalledTimes(2);
      expect(getAnalysisSpy).toHaveBeenLastCalledWith('event-456');
    });
  });
});
