/**
 * SpreadBreadthService - 传播路径/时间线/用户类型统计测试
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

describe('SpreadBreadthService - 路径/时间线/用户类型', () => {
  let service: ReturnType<typeof setupSpreadBreadthTest>['service'];
  let mockQueryBuilder: ReturnType<typeof setupSpreadBreadthTest>['mockQueryBuilder'];

  beforeEach(() => {
    const ctx = setupSpreadBreadthTest();
    service = ctx.service;
    mockQueryBuilder = ctx.mockQueryBuilder;
  });

  describe('传播路径分析', () => {
    it('应该正确构建传播路径', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'repost1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.propagationPaths).not.toHaveLength(0);
      // 当 postAuthorName 未设置时，默认使用 "帖子{postId}" 格式
      expect(result.propagationPaths[0]).toMatchObject({
        source: '帖子post1',
        target: 'User A',
        level: 1,
        weight: expect.any(Number),
      });
    });

    it('应该限制传播路径数量', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = Array.from({ length: 1000 }, (_, i) => ({
        postId: 'post1',
        repostId: `repost${i}`,
        userId: `10000${i}`,
        screenName: `User ${i}`,
        userClass: null,
        verified: false,
        createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
      }));

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.propagationPaths.length).toBeLessThanOrEqual(500);
    });
  });

  describe('传播时间线生成', () => {
    it('应该正确生成传播时间线', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:30:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadTimeline).not.toHaveLength(0);
      expect(result.spreadTimeline[0]).toMatchObject({
        timestamp: expect.any(String),
        count: expect.any(Number),
        cumulative: expect.any(Number),
      });

      let lastCumulative = 0;
      for (const point of result.spreadTimeline) {
        expect(point.cumulative).toBeGreaterThanOrEqual(lastCumulative);
        lastCumulative = point.cumulative;
      }
    });

    it('应该按时间正序排列时间线', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z') },
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      const timestamps = result.spreadTimeline.map(p => p.timestamp);
      const sortedTimestamps = [...timestamps].sort();
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('用户类型统计', () => {
    it('应该正确统计各类型用户的转发数', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'VIP User', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
        { postId: 'post1', repostId: 'repost4', userId: '100004', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T10:15:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.repostByUserType).toHaveLength(3);

      const vipType = result.repostByUserType.find(t => t.type === 'vip');
      expect(vipType?.count).toBe(2);
      expect(vipType?.percentage).toBeCloseTo(50, 0);

      const verifiedType = result.repostByUserType.find(t => t.type === 'verified');
      expect(verifiedType?.count).toBe(1);
      expect(verifiedType?.percentage).toBeCloseTo(25, 0);

      const ordinaryType = result.repostByUserType.find(t => t.type === 'ordinary');
      expect(ordinaryType?.count).toBe(1);
      expect(ordinaryType?.percentage).toBeCloseTo(25, 0);
    });

    it('用户类型百分比总和应该为100%', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      const totalPercentage = result.repostByUserType.reduce((sum, t) => sum + t.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });
});
