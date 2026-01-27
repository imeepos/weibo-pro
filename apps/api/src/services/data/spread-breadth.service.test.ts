import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpreadBreadthService } from './spread-breadth.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('SpreadBreadthService', () => {
  let service: SpreadBreadthService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // 创建 mock query builder
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      setParameter: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
      getMany: vi.fn().mockResolvedValue([]),
    };

    // Mock getRepository to return query builder
    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => mockQueryBuilder),
    } as any);

    // 创建 mock cache service
    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
      return fn();
    });

    service = new SpreadBreadthService(cacheService);
    vi.clearAllMocks();
  });

  const mockPosts = (ids: string[]) => ids.map(id => ({ postId: id }));

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
      vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
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

  describe('边界条件', () => {
    it('应该处理重复转发', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(2);
      expect(result.uniqueReposters).toBe(1);
    });

    it('应该处理循环转发', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'repost1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost2', repostId: 'repost3', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadDepth).toBeGreaterThan(0);
      expect(result.uniqueReposters).toBe(2);
    });
  });

  describe('聚合传播数据', () => {
    it('应该生成聚合节点数据', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 测试 aggregatedPropagation 字段存在
      expect(result.aggregatedPropagation).toBeDefined();
      expect(result.aggregatedPropagation?.nodes).toBeDefined();
      expect(result.aggregatedPropagation?.links).toBeDefined();
      expect(result.aggregatedPropagation?.levelStats).toBeDefined();
    });

    it('应该按用户类型聚合节点', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        // Level 1 - 各类型用户
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'VIP User 1', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:10:00Z') },
        { postId: 'post1', repostId: 'repost4', userId: '100004', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:15:00Z') },
        // Level 2 - 更多用户
        { postId: 'repost1', repostId: 'repost5', userId: '100005', screenName: 'VIP User 3', userClass: 1, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost2', repostId: 'repost6', userId: '100006', screenName: 'Ordinary User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 测试每层有 VIP/普通/认证 三种聚合节点
      const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
      const level1Nodes = aggregatedNodes.filter(n => n.level === 1 && n.type === 'aggregated');

      // 应该有按用户类型分组的聚合节点
      const userTypes = level1Nodes.map(n => n.userType);
      expect(userTypes).toContain('vip');
      expect(userTypes).toContain('ordinary');
      expect(userTypes).toContain('verified');
    });

    it('应该保留每层 Top N 用户', async () => {
      const mockPostsData = mockPosts(['post1']);
      // 创建多个用户的转发数据
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'Top User 1', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), followers: 10000 },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'Top User 2', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), followers: 8000 },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Top User 3', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:10:00Z'), followers: 6000 },
        { postId: 'post1', repostId: 'repost4', userId: '100004', screenName: 'Normal User 1', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:15:00Z'), followers: 100 },
        { postId: 'post1', repostId: 'repost5', userId: '100005', screenName: 'Normal User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:20:00Z'), followers: 50 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 测试 topUsers 数组包含正确的用户
      const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
      const nodesWithTopUsers = aggregatedNodes.filter(n => n.topUsers && n.topUsers.length > 0);

      expect(nodesWithTopUsers.length).toBeGreaterThan(0);

      // 验证 topUsers 结构
      for (const node of nodesWithTopUsers) {
        for (const topUser of node.topUsers || []) {
          expect(topUser.userId).toBeDefined();
          expect(topUser.screenName).toBeDefined();
          expect(topUser.weight).toBeDefined();
        }
      }
    });

    it('应该正确计算层级统计', async () => {
      const mockPostsData = mockPosts(['post1']);
      const mockReposts = [
        // Level 1
        { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'VIP User', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
        { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z') },
        { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
        // Level 2
        { postId: 'repost1', repostId: 'repost4', userId: '100004', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
        { postId: 'repost2', repostId: 'repost5', userId: '100005', screenName: 'Ordinary User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 测试 levelStats 数据正确
      const levelStats = result.aggregatedPropagation?.levelStats || [];

      expect(levelStats.length).toBeGreaterThan(0);

      // 验证 Level 1 统计
      const level1Stats = levelStats.find(s => s.level === 1);
      expect(level1Stats).toBeDefined();
      expect(level1Stats?.totalUsers).toBe(3);
      expect(level1Stats?.totalReposts).toBe(3);
      expect(level1Stats?.byUserType.vip.count).toBe(1);
      expect(level1Stats?.byUserType.verified.count).toBe(1);
      expect(level1Stats?.byUserType.ordinary.count).toBe(1);

      // 验证 Level 2 统计
      const level2Stats = levelStats.find(s => s.level === 2);
      expect(level2Stats).toBeDefined();
      expect(level2Stats?.totalUsers).toBe(2);
      expect(level2Stats?.totalReposts).toBe(2);
    });

    it('应该限制聚合节点总数', async () => {
      const mockPostsData = mockPosts(['post1']);
      // 创建大量转发数据
      const mockReposts = Array.from({ length: 500 }, (_, i) => ({
        postId: i < 100 ? 'post1' : `repost${Math.floor(i / 5)}`,
        repostId: `repost${i}`,
        userId: `10000${i}`,
        screenName: `User ${i}`,
        userClass: i % 3 === 0 ? 1 : null,
        verified: i % 5 === 0,
        createdAt: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
      }));

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 测试节点数量不超过合理范围（如 50 个）
      const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
      expect(aggregatedNodes.length).toBeLessThanOrEqual(50);
    });
  });
});
