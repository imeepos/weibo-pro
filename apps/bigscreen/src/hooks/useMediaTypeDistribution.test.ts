import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaTypeDistribution } from './useMediaTypeDistribution';
import { root } from '@sker/core';
import type { MediaTypeAnalysis } from '@sker/sdk';

// Mock data
const mockMediaTypeData: MediaTypeAnalysis = {
  distribution: [
    {
      type: 'text',
      count: 100,
      percentage: 40,
      avgEngagement: 25,
    },
    {
      type: 'image',
      count: 75,
      percentage: 30,
      avgEngagement: 35,
    },
    {
      type: 'video',
      count: 50,
      percentage: 20,
      avgEngagement: 50,
    },
    {
      type: 'link',
      count: 15,
      percentage: 6,
      avgEngagement: 20,
    },
    {
      type: 'mixed',
      count: 10,
      percentage: 4,
      avgEngagement: 45,
    },
  ],
  totalPosts: 250,
  trend: [
    {
      timestamp: '2024-01-01T10:00:00Z',
      types: {
        text: 10,
        image: 8,
        video: 5,
        link: 2,
        mixed: 1,
      },
    },
    {
      timestamp: '2024-01-01T11:00:00Z',
      types: {
        text: 15,
        image: 12,
        video: 8,
        link: 3,
        mixed: 2,
      },
    },
  ],
  engagementByType: [
    {
      type: 'text',
      avgLikes: 10,
      avgComments: 5,
      avgReposts: 2,
    },
    {
      type: 'image',
      avgLikes: 15,
      avgComments: 8,
      avgReposts: 3,
    },
    {
      type: 'video',
      avgLikes: 25,
      avgComments: 12,
      avgReposts: 5,
    },
  ],
};

// Mock controller
class MockMediaTypeController {
  async getDistribution(eventId: string): Promise<MediaTypeAnalysis> {
    return mockMediaTypeData;
  }
}

describe('useMediaTypeDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册 mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockMediaTypeController() as any);
  });

  describe('基础功能', () => {
    it('应该正常获取数据', async () => {
      const { result } = renderHook(() => useMediaTypeDistribution('event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockMediaTypeData);
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
        getDistribution: vi.fn().mockReturnValue(pendingPromise),
      } as any);

      const { result } = renderHook(() => useMediaTypeDistribution('event-123'));

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      resolveController(mockMediaTypeData);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('应该处理空数据', async () => {
      const emptyData: MediaTypeAnalysis = {
        distribution: [],
        totalPosts: 0,
        trend: [],
        engagementByType: [],
      };

      vi.spyOn(root, 'get').mockReturnValue({
        getDistribution: vi.fn().mockResolvedValue(emptyData),
      } as any);

      const { result } = renderHook(() => useMediaTypeDistribution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.distribution).toEqual([]);
      expect(result.current.data?.totalPosts).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理错误', async () => {
      const mockError = new Error('Network request failed');

      vi.spyOn(root, 'get').mockReturnValue({
        getDistribution: vi.fn().mockRejectedValue(mockError),
      } as any);

      const { result } = renderHook(() => useMediaTypeDistribution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeNull();
    });
  });

  describe('缓存和重新请求', () => {
    it('应该使用缓存', async () => {
      const mockController = new MockMediaTypeController();
      const getDistributionSpy = vi.spyOn(mockController, 'getDistribution');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result } = renderHook(() => useMediaTypeDistribution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getDistributionSpy).toHaveBeenCalledTimes(1);
      expect(getDistributionSpy).toHaveBeenCalledWith('event-123');
    });

    it('应该在参数变化时重新请求', async () => {
      const mockController = new MockMediaTypeController();
      const getDistributionSpy = vi.spyOn(mockController, 'getDistribution');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result, rerender } = renderHook(
        ({ eventId }) => useMediaTypeDistribution(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getDistributionSpy).toHaveBeenCalledTimes(1);

      // Change eventId
      rerender({ eventId: 'event-456' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getDistributionSpy).toHaveBeenCalledTimes(2);
      expect(getDistributionSpy).toHaveBeenLastCalledWith('event-456');
    });
  });
});
