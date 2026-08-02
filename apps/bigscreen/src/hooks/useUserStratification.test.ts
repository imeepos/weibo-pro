import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserStratification } from './useUserStratification';
import type { UserStratification } from '@sker/sdk';
import { root } from '@sker/core';

// Mock data
const mockStratificationData: UserStratification = {
  layers: [
    { name: 'core', count: 10, percentage: 20, avgEngagement: 15, color: '#f59e0b' },
    { name: 'active', count: 20, percentage: 40, avgEngagement: 5, color: '#3b82f6' },
    { name: 'casual', count: 15, percentage: 30, avgEngagement: 1.5, color: '#10b981' },
    { name: 'lurker', count: 5, percentage: 10, avgEngagement: 0, color: '#6b7280' },
  ],
  engagementGini: 0.45,
  totalUsers: 50,
  summary: {
    coreRatio: 0.2,
    activeRatio: 0.6,
    paretoIndex: 0.55,
  },
};

// Mock controller
class MockUserStratificationController {
  async getStratification(_eventId: string): Promise<UserStratification> {
    return mockStratificationData;
  }
}

describe('useUserStratification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 注册mock controller
    vi.spyOn(root, 'get').mockReturnValue(new MockUserStratificationController());
  });

  describe('基础功能', () => {
    it('应该正常获取数据', async () => {
      const { result } = renderHook(() => useUserStratification('event-123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStratificationData);
      });
    });

    it('应该处理空数据', async () => {
      const emptyData: UserStratification = {
        layers: [
          { name: 'core', count: 0, percentage: 0, avgEngagement: 0, color: '#f59e0b' },
          { name: 'active', count: 0, percentage: 0, avgEngagement: 0, color: '#3b82f6' },
          { name: 'casual', count: 0, percentage: 0, avgEngagement: 0, color: '#10b981' },
          { name: 'lurker', count: 0, percentage: 0, avgEngagement: 0, color: '#6b7280' },
        ],
        engagementGini: 0,
        totalUsers: 0,
        summary: {
          coreRatio: 0,
          activeRatio: 0,
          paretoIndex: 0,
        },
      };

      class EmptyMockController {
        async getStratification() {
          return emptyData;
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new EmptyMockController());

      const { result } = renderHook(() => useUserStratification('event-empty'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.totalUsers).toBe(0);
      });
    });
  });

  describe('加载状态', () => {
    it('初始状态应该是加载中', () => {
      const { result } = renderHook(() => useUserStratification('event-123'));

      expect(result.current.isLoading).toBe(true);
    });

    it('加载完成后应该设置为false', async () => {
      const { result } = renderHook(() => useUserStratification('event-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理API错误', async () => {
      class ErrorMockController {
        async getStratification() {
          throw new Error('API Error');
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new ErrorMockController());

      const { result } = renderHook(() => useUserStratification('event-error'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('错误状态下data应该为null', async () => {
      class ErrorMockController {
        async getStratification() {
          throw new Error('API Error');
        }
      }

      vi.spyOn(root, 'get').mockReturnValue(new ErrorMockController());

      const { result } = renderHook(() => useUserStratification('event-error'));

      await waitFor(() => {
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('缓存功能', () => {
    it('相同eventId应该使用缓存', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useUserStratification(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStratificationData);
      });

      // 重新渲染相同的事件ID
      rerender({ eventId: 'event-123' });

      // 应该立即返回缓存数据，不触发加载状态
      expect(result.current.isLoading).toBe(false);
    });

    it('不同eventId应该触发新的请求', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useUserStratification(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStratificationData);
      });

      // 更改事件ID
      rerender({ eventId: 'event-456' });

      // 应该触发新的请求，进入加载状态
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('参数变化', () => {
    it('eventId变化时应该重新获取数据', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useUserStratification(eventId),
        { initialProps: { eventId: 'event-123' } }
      );

      const _firstData = result.current.data;

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // 更改eventId
      rerender({ eventId: 'event-456' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 应该是新的数据（虽然在这个测试中可能是相同的mock数据）
      expect(result.current.data).toBeDefined();
    });
  });

  describe('数据结构验证', () => {
    it('返回的数据应该包含所有必需字段', async () => {
      const { result } = renderHook(() => useUserStratification('event-123'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        const data = result.current.data!;

        expect(data).toHaveProperty('layers');
        expect(data).toHaveProperty('engagementGini');
        expect(data).toHaveProperty('totalUsers');
        expect(data).toHaveProperty('summary');

        expect(data.layers).toHaveLength(4);
        expect(data.summary).toHaveProperty('coreRatio');
        expect(data.summary).toHaveProperty('activeRatio');
        expect(data.summary).toHaveProperty('paretoIndex');
      });
    });

    it('分层数据应该按照正确的顺序', async () => {
      const { result } = renderHook(() => useUserStratification('event-123'));

      await waitFor(() => {
        expect(result.current.data?.layers[0].name).toBe('core');
        expect(result.current.data?.layers[1].name).toBe('active');
        expect(result.current.data?.layers[2].name).toBe('casual');
        expect(result.current.data?.layers[3].name).toBe('lurker');
      });
    });
  });
});
