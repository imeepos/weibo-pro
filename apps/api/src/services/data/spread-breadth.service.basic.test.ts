/**
 * SpreadBreadthService - 空数据处理与缓存行为测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockEntityManager } from '../../test-setup';
import { setupSpreadBreadthTest, mockPosts } from './spread-breadth.service.test-helpers';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('SpreadBreadthService - 空数据处理与缓存', () => {
  let service: ReturnType<typeof setupSpreadBreadthTest>['service'];
  let cacheService: ReturnType<typeof setupSpreadBreadthTest>['cacheService'];
  let mockQueryBuilder: ReturnType<typeof setupSpreadBreadthTest>['mockQueryBuilder'];

  beforeEach(() => {
    const ctx = setupSpreadBreadthTest();
    service = ctx.service;
    cacheService = ctx.cacheService;
    mockQueryBuilder = ctx.mockQueryBuilder;
  });

  describe('空数据处理', () => {
    it('应该返回默认结构当事件没有转发数据', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(0);
      expect(result.uniqueReposters).toBe(0);
      expect(result.spreadDepth).toBe(0);
      expect(result.spreadWidth).toBe(0);
      expect(result.breadthIndex).toBe(0);
      expect(result.propagationPaths).toEqual([]);
      expect(result.spreadTimeline).toEqual([]);
      expect(result.repostByUserType).toEqual([
        { type: 'vip', count: 0, percentage: 0 },
        { type: 'ordinary', count: 0, percentage: 0 },
        { type: 'verified', count: 0, percentage: 0 },
      ]);
    });

    it('应该处理数据库查询异常并返回默认结构', async () => {
      mockQueryBuilder.getRawMany.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(0);
      expect(result.spreadDepth).toBe(0);
      expect(result.breadthIndex).toBe(0);
    });
  });

  describe('缓存行为', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        totalReposts: 100,
        uniqueReposters: 80,
        spreadDepth: 5,
        spreadWidth: 3.5,
        breadthIndex: 0.75,
        propagationPaths: [],
        spreadTimeline: [],
        repostByUserType: [],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getBreadthAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'spread:breadth:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });

    it('缓存失效后应该重新计算', async () => {
      let callCount = 0;
      vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
        callCount++;
        return fn();
      });

      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [{ postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') }];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      await service.getBreadthAnalysis('event-123');
      await service.getBreadthAnalysis('event-123');

      expect(callCount).toBe(2);
    });
  });
});
