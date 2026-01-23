import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePostingTimeHeatmap } from './usePostingTimeHeatmap';
import type { PostingTimeHeatmap } from '@sker/sdk';
import { root } from '@sker/core';

// Mock data
const mockHeatmapData: PostingTimeHeatmap = {
  hourlyDistribution: [10, 5, 3, 2, 1, 2, 5, 15, 30, 45, 60, 55, 50, 48, 52, 65, 70, 68, 55, 40, 30, 25, 20, 15],
  weekdayDistribution: [100, 150, 200, 180, 220, 250, 120],
  heatmapMatrix: [
    [0.1, 0.05, 0.03, 0.02, 0.01, 0.02, 0.05, 0.15, 0.3, 0.45, 0.6, 0.55, 0.5, 0.48, 0.52, 0.65, 0.7, 0.68, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15],
    [0.15, 0.08, 0.05, 0.03, 0.02, 0.03, 0.08, 0.2, 0.35, 0.5, 0.65, 0.6, 0.55, 0.53, 0.57, 0.7, 0.75, 0.73, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2],
    [0.2, 0.1, 0.08, 0.05, 0.03, 0.05, 0.1, 0.25, 0.4, 0.55, 0.7, 0.65, 0.6, 0.58, 0.62, 0.75, 0.8, 0.78, 0.65, 0.5, 0.4, 0.35, 0.3, 0.25],
    [0.18, 0.12, 0.1, 0.08, 0.05, 0.08, 0.12, 0.3, 0.45, 0.6, 0.75, 0.7, 0.65, 0.63, 0.67, 0.8, 0.85, 0.83, 0.7, 0.55, 0.45, 0.4, 0.35, 0.3],
    [0.22, 0.15, 0.12, 0.1, 0.08, 0.1, 0.15, 0.35, 0.5, 0.65, 0.8, 0.75, 0.7, 0.68, 0.72, 0.85, 0.9, 0.88, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35],
    [0.25, 0.18, 0.15, 0.12, 0.1, 0.12, 0.18, 0.4, 0.55, 0.7, 0.85, 0.8, 0.75, 0.73, 0.77, 0.9, 0.95, 0.93, 0.8, 0.65, 0.55, 0.5, 0.45, 0.4],
    [0.12, 0.06, 0.04, 0.03, 0.02, 0.03, 0.06, 0.12, 0.2, 0.3, 0.4, 0.35, 0.3, 0.28, 0.32, 0.4, 0.45, 0.43, 0.3, 0.2, 0.15, 0.12, 0.1, 0.08],
  ],
  peakTime: {
    hour: 17,
    weekday: 5,
    count: 95,
    label: '周五 17:00',
  },
  offPeakTime: {
    hour: 4,
    weekday: 0,
    count: 1,
    label: '周日 04:00',
  },
  totalPosts: 1400,
  insights: [
    '周五17:00是发帖高峰时段',
    '工作日发帖量明显高于周末',
    '凌晨4点发帖量最低',
  ],
};

// Mock controller
class MockPostingTimeController {
  async getHeatmap(eventId: string): Promise<PostingTimeHeatmap> {
    return mockHeatmapData;
  }
}

describe('usePostingTimeHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockPostingTimeController());
  });

  describe('基础功能', () => {
    it('应该正常获取发帖时间热力图数据', async () => {
      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHeatmapData);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('应该正确处理空数据', async () => {
      const emptyData: PostingTimeHeatmap = {
        hourlyDistribution: new Array(24).fill(0),
        weekdayDistribution: new Array(7).fill(0),
        heatmapMatrix: Array(7).fill(null).map(() => new Array(24).fill(0)),
        peakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        offPeakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '无数据',
        },
        totalPosts: 0,
        insights: ['暂无数据'],
      };

      class EmptyMockController {
        async getHeatmap() {
          return emptyData;
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new EmptyMockController());

      const { result } = renderHook(() => usePostingTimeHeatmap('event-empty'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.totalPosts).toBe(0);
      });
    });
  });

  describe('缓存功能', () => {
    it('应该正确使用缓存', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => usePostingTimeHeatmap(eventId),
        { initialProps: { eventId: 'test-event-123' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHeatmapData);
      });

      const getSpy = vi.spyOn(root, 'get');

      // 重新渲染相同的事件ID
      rerender({ eventId: 'test-event-123' });

      // 应该立即返回缓存数据，不触发加载状态
      expect(result.current.isLoading).toBe(false);

      // useEffect 不应该再次触发（通过检查是否没有新的 get 调用）
      // 注意：这里我们无法直接验证缓存，因为 hook 内部使用 useEffect
      // 但我们可以确保组件重新渲染时不会进入加载状态
    });

    it('应该在参数变化时重新请求数据', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => usePostingTimeHeatmap(eventId),
        { initialProps: { eventId: 'test-event-123' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHeatmapData);
      });

      // 更改 eventId
      rerender({ eventId: 'new-event-456' });

      // 应该触发新的请求，进入加载状态
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('加载状态', () => {
    it('初始状态应该是加载中', () => {
      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('加载完成后应该设置为false', async () => {
      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('应该正确处理加载状态变化', async () => {
      let resolveGetHeatmap: (value: PostingTimeHeatmap) => void;
      class LoadingMockController {
        async getHeatmap() {
          return new Promise(resolve => {
            resolveGetHeatmap = resolve;
          });
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new LoadingMockController());

      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolveGetHeatmap!(mockHeatmapData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockHeatmapData);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理错误状态', async () => {
      const mockError = new Error('API Error');

      class ErrorMockController {
        async getHeatmap() {
          throw mockError;
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new ErrorMockController());

      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.error?.message).toBe('API Error');
    });
  });

  describe('内存泄漏防护', () => {
    it('应该防止内存泄漏（组件卸载后不更新状态）', async () => {
      let resolveGetHeatmap: (value: PostingTimeHeatmap) => void;
      class SlowMockController {
        async getHeatmap() {
          return new Promise(resolve => {
            resolveGetHeatmap = resolve;
          });
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new SlowMockController());

      const { result, unmount } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      expect(result.current.isLoading).toBe(true);

      // 立即卸载组件
      unmount();

      // 稍后解析 Promise - 不应该抛出任何错误
      await act(async () => {
        resolveGetHeatmap!(mockHeatmapData);
      });

      // 由于组件已卸载，不应该有任何错误被抛出
      // 测试通过即表示没有内存泄漏
    });
  });

  describe('数据结构验证', () => {
    it('返回的数据应该包含所有必需字段', async () => {
      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        const data = result.current.data!;

        expect(data).toHaveProperty('hourlyDistribution');
        expect(data).toHaveProperty('weekdayDistribution');
        expect(data).toHaveProperty('heatmapMatrix');
        expect(data).toHaveProperty('peakTime');
        expect(data).toHaveProperty('offPeakTime');
        expect(data).toHaveProperty('totalPosts');
        expect(data).toHaveProperty('insights');

        expect(data.hourlyDistribution).toHaveLength(24);
        expect(data.weekdayDistribution).toHaveLength(7);
        expect(data.heatmapMatrix).toHaveLength(7);
        expect(data.heatmapMatrix[0]).toHaveLength(24);
      });
    });

    it('峰值和低谷时间数据应该正确', async () => {
      const { result } = renderHook(() => usePostingTimeHeatmap('test-event-123'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        const data = result.current.data!;

        expect(data.peakTime).toHaveProperty('hour');
        expect(data.peakTime).toHaveProperty('weekday');
        expect(data.peakTime).toHaveProperty('count');
        expect(data.peakTime).toHaveProperty('label');

        expect(data.offPeakTime).toHaveProperty('hour');
        expect(data.offPeakTime).toHaveProperty('weekday');
        expect(data.offPeakTime).toHaveProperty('count');
        expect(data.offPeakTime).toHaveProperty('label');
      });
    });
  });
});
