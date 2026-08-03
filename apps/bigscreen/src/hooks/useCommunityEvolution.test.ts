import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommunityEvolution } from './useCommunityEvolution';
import { root } from '@sker/core';
import {
  mockEvolutionData,
  emptyEvolutionData,
  MockCommunityEvolutionController,
} from './useCommunityEvolution.test.fixtures';

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
      vi.spyOn(root, 'get').mockReturnValue({
        getAnalysis: vi.fn().mockResolvedValue(emptyEvolutionData),
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
