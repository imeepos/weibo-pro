/**
 * SpreadBreadthService - 传播深度/宽度/广度指数计算测试
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

describe('SpreadBreadthService - 传播计算', () => {
  let service: ReturnType<typeof setupSpreadBreadthTest>['service'];
  let mockQueryBuilder: ReturnType<typeof setupSpreadBreadthTest>['mockQueryBuilder'];

  beforeEach(() => {
    const ctx = setupSpreadBreadthTest();
    service = ctx.service;
    mockQueryBuilder = ctx.mockQueryBuilder;
  });

  describe('传播深度计算', () => {
    it('应该正确计算单层传播深度', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [{
        postId: 'post1',
        repostId: 'repost1',
        userId: '100001',
        screenName: 'User A',
        userClass: null,
        verified: false,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      }];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(1);
      expect(result.uniqueReposters).toBe(1);
      expect(result.spreadDepth).toBe(1);
    });

    it('应该正确计算多层传播深度', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'repost1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost2', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadDepth).toBe(3);
    });
  });

  describe('传播宽度计算', () => {
    it('应该正确计算每层平均转发数', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        // Level 1 - 3个用户转发原始帖子
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
        // Level 2 - 6个转发
        { postId: 'repost1', repostId: 'repost4', userId: '100004', screenName: 'User D', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost1', repostId: 'repost5', userId: '100005', screenName: 'User E', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
        { postId: 'repost2', repostId: 'repost6', userId: '100006', screenName: 'User F', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:10:00Z') },
        { postId: 'repost2', repostId: 'repost7', userId: '100007', screenName: 'User G', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:15:00Z') },
        { postId: 'repost3', repostId: 'repost8', userId: '100008', screenName: 'User H', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:20:00Z') },
        { postId: 'repost3', repostId: 'repost9', userId: '100009', screenName: 'User I', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:25:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      // Level 1: 3个转发, Level 2: 6个转发
      // spreadWidth = 9 / 2 = 4.5
      expect(result.spreadWidth).toBeCloseTo(4.5, 1);
    });

    it('应该处理只有一层转发的情况', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadWidth).toBe(2);
    });
  });

  describe('传播广度指数计算', () => {
    it('应该正确计算传播广度指数', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User 1', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User 3', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
        { postId: 'repost1', repostId: 'repost4', userId: '100004', screenName: 'User 4', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost1', repostId: 'repost5', userId: '100005', screenName: 'User 5', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
        { postId: 'repost2', repostId: 'repost6', userId: '100006', screenName: 'User 6', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:10:00Z') },
        { postId: 'repost2', repostId: 'repost7', userId: '100007', screenName: 'User 7', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:15:00Z') },
        { postId: 'repost3', repostId: 'repost8', userId: '100008', screenName: 'User 8', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:20:00Z') },
        { postId: 'repost3', repostId: 'repost9', userId: '100009', screenName: 'User 9', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:25:00Z') },
        { postId: 'repost4', repostId: 'repost10', userId: '100010', screenName: 'User 10', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.breadthIndex).toBeGreaterThan(0);
      expect(result.breadthIndex).toBeLessThanOrEqual(1);
    });

    it('广度指数应该在 0-1 范围内', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.breadthIndex).toBeGreaterThanOrEqual(0);
      expect(result.breadthIndex).toBeLessThanOrEqual(1);
    });
  });
});
