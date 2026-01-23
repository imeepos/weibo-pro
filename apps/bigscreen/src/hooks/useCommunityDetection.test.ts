import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommunityDetection } from './useCommunityDetection';
import { root } from '@sker/core';
import type { CommunityAnalysis } from '@sker/sdk';

// Mock data
const mockCommunityData: CommunityAnalysis = {
  communities: [
    {
      id: 'community-0',
      name: 'Community 1',
      members: [
        {
          userId: 'user1',
          screenName: 'User One',
          role: 'leader',
          inDegree: 5,
          outDegree: 3,
        },
      ],
      size: 10,
      density: 0.8,
      avgInfluence: 0.75,
      topKeywords: ['keyword1', 'keyword2'],
      sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
    },
  ],
  modularity: 0.75,
  totalCommunities: 2,
  interCommunityLinks: [
    {
      sourceCommunity: 'community-0',
      targetCommunity: 'community-1',
      weight: 5,
    },
  ],
  bridgeUsers: [
    {
      userId: 'user1',
      screenName: 'User One',
      communities: ['community-0', 'community-1'],
      bridgeScore: 0.8,
    },
  ],
};

// Mock controller
class MockCommunityDetectionController {
  async getAnalysis(eventId: string): Promise<CommunityAnalysis> {
    return mockCommunityData;
  }
}

describe('useCommunityDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册 mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockCommunityDetectionController() as any);
  });

  describe('基础功能', () => {
    it('应该正常获取数据', async () => {
      const { result } = renderHook(() => useCommunityDetection('event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCommunityData);
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

      const { result } = renderHook(() => useCommunityDetection('event-123'));

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      resolveController(mockCommunityData);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('应该处理空数据', async () => {
      const emptyData: CommunityAnalysis = {
        communities: [],
        modularity: 0,
        totalCommunities: 0,
        interCommunityLinks: [],
        bridgeUsers: [],
      };

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockResolvedValue(emptyData),
      } as any);

      const { result } = renderHook(() => useCommunityDetection('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.communities).toEqual([]);
      expect(result.current.data?.totalCommunities).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理错误', async () => {
      const mockError = new Error('Network request failed');

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockRejectedValue(mockError),
      } as any);

      const { result } = renderHook(() => useCommunityDetection('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeNull();
    });
  });

  describe('缓存和重新请求', () => {
    it('应该使用缓存', async () => {
      const mockController = new MockCommunityDetectionController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result } = renderHook(() => useCommunityDetection('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getAnalysisSpy).toHaveBeenCalledTimes(1);
      expect(getAnalysisSpy).toHaveBeenCalledWith('event-123');
    });

    it('应该在参数变化时重新请求', async () => {
      const mockController = new MockCommunityDetectionController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result, rerender } = renderHook(
        ({ eventId }) => useCommunityDetection(eventId),
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
