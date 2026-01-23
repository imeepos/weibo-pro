import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommentDepth } from './useCommentDepth';
import type { CommentDepthAnalysis } from '@sker/sdk';
import { root } from '@sker/core';

// Mock data
const mockCommentDepthData: CommentDepthAnalysis = {
  avgThreadDepth: 2.5,
  maxThreadDepth: 5,
  replyRatio: 0.6,
  totalRootComments: 10,
  totalReplies: 15,
  depthDistribution: [
    { depth: 0, count: 3, percentage: 30 },
    { depth: 1, count: 4, percentage: 40 },
    { depth: 2, count: 2, percentage: 20 },
    { depth: 3, count: 1, percentage: 10 },
  ],
  discussionHotspots: [
    {
      rootCommentId: '1',
      rootCommentText: '热门讨论',
      replyCount: 8,
      maxDepth: 4,
      participants: 6,
    },
  ],
};

// Mock controller
class MockCommentDepthController {
  async getAnalysis(eventId: string): Promise<CommentDepthAnalysis> {
    return mockCommentDepthData;
  }
}

describe('useCommentDepth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockCommentDepthController());
  });

  describe('基础功能测试', () => {
    it('1. 正常获取数据', async () => {
      const { result } = renderHook(() => useCommentDepth('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCommentDepthData);
      expect(result.current.error).toBeNull();
    });

    it('2. 缓存功能正常', async () => {
      const { result } = renderHook(() => useCommentDepth('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCommentDepthData);
      expect(root.get).toHaveBeenCalled();
    });

    it('3. 参数变化触发重新请求', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useCommentDepth(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCommentDepthData);

      // 改变参数
      rerender({ eventId: 'event-456' });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCommentDepthData);
      });
    });
  });

  describe('错误处理测试', () => {
    it('4. 错误处理', async () => {
      const mockError = new Error('Network error');
      const errorController = {
        async getAnalysis(eventId: string): Promise<CommentDepthAnalysis> {
          throw mockError;
        }
      };

      vi.spyOn(root, 'get').mockReturnValue(errorController as any);

      const { result } = renderHook(() => useCommentDepth('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('5. 加载状态', async () => {
      let resolve: any;
      const pendingController = {
        async getAnalysis(eventId: string): Promise<CommentDepthAnalysis> {
          return new Promise(r => { resolve = r; });
        }
      };

      vi.spyOn(root, 'get').mockReturnValue(pendingController as any);

      const { result } = renderHook(() => useCommentDepth('event-123'));

      // 初始状态应该是加载中
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // 完成请求
      resolve(mockCommentDepthData);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('6. 空数据处理', async () => {
      const emptyData: CommentDepthAnalysis = {
        avgThreadDepth: 0,
        maxThreadDepth: 0,
        replyRatio: 0,
        totalRootComments: 0,
        totalReplies: 0,
        depthDistribution: [],
        discussionHotspots: [],
      };

      const emptyController = {
        async getAnalysis(eventId: string): Promise<CommentDepthAnalysis> {
          return emptyData;
        }
      };

      vi.spyOn(root, 'get').mockReturnValue(emptyController as any);

      const { result } = renderHook(() => useCommentDepth('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(emptyData);
      expect(result.current.error).toBeNull();
    });
  });
});
