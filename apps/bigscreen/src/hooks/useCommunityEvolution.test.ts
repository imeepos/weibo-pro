import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommunityEvolution } from './useCommunityEvolution';
import { root } from '@sker/core';
import type { CommunityEvolutionAnalysis } from '@sker/sdk';

// Mock data
const mockEvolutionData: CommunityEvolutionAnalysis = {
  timeSlices: [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
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
      totalMembers: 10,
    },
    {
      timestamp: '2024-01-02T00:00:00.000Z',
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
          size: 12,
          density: 0.85,
          avgInfluence: 0.8,
          topKeywords: ['keyword1', 'keyword2'],
          sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
        },
      ],
      modularity: 0.78,
      totalMembers: 12,
    },
  ],
  evolutionEvents: [
    {
      type: 'growth',
      timestamp: '2024-01-02T00:00:00.000Z',
      involvedCommunities: ['community-0', 'community-0'],
      magnitude: 0.2,
      description: '社区 Community 1 成长 20%',
    },
  ],
  overallStability: 0.9,
  keyChanges: [
    {
      communityId: 'community-0',
      changeType: 'growth',
      beforeSize: 10,
      afterSize: 12,
      keyMembers: ['user2'],
    },
  ],
  trendPrediction: {
    predictedCommunityCount: 3,
    predictedModularity: 0.75,
    confidence: 0.8,
  },
};

// Mock controller
class MockCommunityEvolutionController {
  async getAnalysis(_eventId: string): Promise<CommunityEvolutionAnalysis> {
    return mockEvolutionData;
  }
}

describe('useCommunityEvolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册 mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockCommunityEvolutionController() as any);
  });

  describe('基础功能', () => {
    it('应该正常获取数据', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockEvolutionData);
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

      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      resolveController(mockEvolutionData);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('应该处理空数据', async () => {
      const emptyData: CommunityEvolutionAnalysis = {
        timeSlices: [],
        evolutionEvents: [],
        overallStability: 0,
        keyChanges: [],
        trendPrediction: {
          predictedCommunityCount: 0,
          predictedModularity: 0,
          confidence: 0,
        },
      };

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockResolvedValue(emptyData),
      } as any);

      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.timeSlices).toEqual([]);
      expect(result.current.data?.evolutionEvents).toEqual([]);
      expect(result.current.data?.overallStability).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理错误', async () => {
      const mockError = new Error('Network request failed');

      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockRejectedValue(mockError),
      } as any);

      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeNull();
    });
  });

  describe('缓存和重新请求', () => {
    it('应该使用缓存', async () => {
      const mockController = new MockCommunityEvolutionController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getAnalysisSpy).toHaveBeenCalledTimes(1);
      expect(getAnalysisSpy).toHaveBeenCalledWith('event-123');
    });

    it('应该在参数变化时重新请求', async () => {
      const mockController = new MockCommunityEvolutionController();
      const getAnalysisSpy = vi.spyOn(mockController, 'getAnalysis');

      vi.spyOn(root, 'get').mockReturnValue(mockController as any);

      const { result, rerender } = renderHook(
        ({ eventId }) => useCommunityEvolution(eventId),
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

  describe('数据结构', () => {
    it('应该返回完整的演化分析数据', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.timeSlices).toBeDefined();
      expect(result.current.data?.evolutionEvents).toBeDefined();
      expect(result.current.data?.overallStability).toBeDefined();
      expect(result.current.data?.keyChanges).toBeDefined();
      expect(result.current.data?.trendPrediction).toBeDefined();
    });

    it('应该包含正确的时间切片数据', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.timeSlices.length).toBeGreaterThan(0);
      expect(result.current.data?.timeSlices[0].timestamp).toBeDefined();
      expect(result.current.data?.timeSlices[0].communities).toBeDefined();
      expect(result.current.data?.timeSlices[0].modularity).toBeDefined();
      expect(result.current.data?.timeSlices[0].totalMembers).toBeDefined();
    });

    it('应该包含正确的演化事件数据', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.evolutionEvents.length).toBeGreaterThan(0);
      expect(result.current.data?.evolutionEvents[0].type).toBeDefined();
      expect(result.current.data?.evolutionEvents[0].timestamp).toBeDefined();
      expect(result.current.data?.evolutionEvents[0].involvedCommunities).toBeDefined();
      expect(result.current.data?.evolutionEvents[0].magnitude).toBeDefined();
      expect(result.current.data?.evolutionEvents[0].description).toBeDefined();
    });

    it('应该包含正确的稳定性指数', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.overallStability).toBeGreaterThanOrEqual(0);
      expect(result.current.data?.overallStability).toBeLessThanOrEqual(1);
    });

    it('应该包含正确的趋势预测', async () => {
      const { result } = renderHook(() => useCommunityEvolution('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.trendPrediction.predictedCommunityCount).toBeDefined();
      expect(result.current.data?.trendPrediction.predictedModularity).toBeDefined();
      expect(result.current.data?.trendPrediction.confidence).toBeDefined();
    });
  });
});
