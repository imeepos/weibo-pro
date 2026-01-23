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

  describe('空数据处理', () => {
    it('应该返回默认结构当事件没有转发数据', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

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
      // 原始帖子 -> 用户A
      const mockReposts = [{
        postId: 'post1',
        repostId: 'repost1',
        userId: 'userA',
        screenName: 'User A',
        userClass: null, // ordinary
        verified: false,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        rootPostId: 'post1',
      }];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(1);
      expect(result.uniqueReposters).toBe(1);
      expect(result.spreadDepth).toBe(1); // 只有 1 层转发
    });

    it('应该正确计算多层传播深度', async () => {
      // 原始帖子 -> 用户A -> 用户B -> 用户C
      const mockReposts = [
        {
          postId: 'post1', // 原始帖子
          repostId: 'repost1',
          userId: 'userA',
          screenName: 'User A',
          userClass: null,
          verified: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          rootPostId: 'post1',
        },
        {
          postId: 'repost1', // 用户A的转发被用户B转发
          repostId: 'repost2',
          userId: 'userB',
          screenName: 'User B',
          userClass: null,
          verified: false,
          createdAt: new Date('2024-01-01T11:00:00Z'),
          rootPostId: 'post1',
        },
        {
          postId: 'repost2', // 用户B的转发被用户C转发
          repostId: 'repost3',
          userId: 'userC',
          screenName: 'User C',
          userClass: null,
          verified: false,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          rootPostId: 'post1',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadDepth).toBe(3); // 3 层转发链
    });
  });

  describe('传播宽度计算', () => {
    it('应该正确计算每层平均转发数（传播宽度）', async () => {
      // Level 0: 原始帖子
      // Level 1: 3个用户转发原始帖子
      // Level 2: 这3个用户各自被2个用户转发
      const mockReposts = [
        // Level 1 - 3个用户转发原始帖子
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost3', userId: 'userC', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z'), rootPostId: 'post1', level: 1 },
        // Level 2 - 每个用户被2个用户转发
        { postId: 'repost1', repostId: 'repost4', userId: 'userD', screenName: 'User D', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost1', repostId: 'repost5', userId: 'userE', screenName: 'User E', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost2', repostId: 'repost6', userId: 'userF', screenName: 'User F', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:10:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost2', repostId: 'repost7', userId: 'userG', screenName: 'User G', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:15:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost3', repostId: 'repost8', userId: 'userH', screenName: 'User H', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:20:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost3', repostId: 'repost9', userId: 'userI', screenName: 'User I', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:25:00Z'), rootPostId: 'post1', level: 2 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // Level 1: 3个转发
      // Level 2: 6个转发
      // spreadWidth = (3 + 6) / 2 = 4.5
      expect(result.spreadWidth).toBeCloseTo(4.5, 1);
    });

    it('应该处理只有一层转发的情况', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 只有一层，平均转发数 = 2
      expect(result.spreadWidth).toBe(2);
    });
  });

  describe('传播广度指数计算', () => {
    it('应该正确计算传播广度指数', async () => {
      const mockReposts = [
        // 10个不同的转发用户
        { postId: 'post1', repostId: 'repost1', userId: 'user1', screenName: 'User 1', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'user2', screenName: 'User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost3', userId: 'user3', screenName: 'User 3', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'repost1', repostId: 'repost4', userId: 'user4', screenName: 'User 4', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost1', repostId: 'repost5', userId: 'user5', screenName: 'User 5', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost2', repostId: 'repost6', userId: 'user6', screenName: 'User 6', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:10:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost2', repostId: 'repost7', userId: 'user7', screenName: 'User 7', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:15:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost3', repostId: 'repost8', userId: 'user8', screenName: 'User 8', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:20:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost3', repostId: 'repost9', userId: 'user9', screenName: 'User 9', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:25:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost4', repostId: 'repost10', userId: 'user10', screenName: 'User 10', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z'), rootPostId: 'post1', level: 3 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // uniqueReposters = 10, totalReposts = 10
      // spreadDepth = 3
      // spreadWidth = (3 + 5 + 1) / 3 ≈ 3
      // breadthIndex = (10/10)*0.3 + (3/maxDepth)*0.3 + (3/avgWidth)*0.4
      expect(result.breadthIndex).toBeGreaterThan(0);
      expect(result.breadthIndex).toBeLessThanOrEqual(1);
    });

    it('广度指数应该在 0-1 范围内', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.breadthIndex).toBeGreaterThanOrEqual(0);
      expect(result.breadthIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('传播路径分析', () => {
    it('应该正确构建传播路径', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'repost1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 2 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.propagationPaths).toHaveLength(2);
      expect(result.propagationPaths[0]).toMatchObject({
        source: 'post1',
        target: 'userA',
        level: 1,
        weight: expect.any(Number),
      });
      expect(result.propagationPaths[1]).toMatchObject({
        source: 'repost1',
        target: 'userB',
        level: 2,
        weight: expect.any(Number),
      });
    });

    it('应该限制传播路径数量（防止性能问题）', async () => {
      // 创建大量转发数据
      const mockReposts = Array.from({ length: 1000 }, (_, i) => ({
        postId: 'post1',
        repostId: `repost${i}`,
        userId: `user${i}`,
        screenName: `User ${i}`,
        userClass: null,
        verified: false,
        createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
        rootPostId: 'post1',
        level: 1,
      }));

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 应该限制路径数量（例如最多500条）
      expect(result.propagationPaths.length).toBeLessThanOrEqual(500);
    });
  });

  describe('传播时间线生成', () => {
    it('应该正确生成传播时间线', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:30:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost3', userId: 'userC', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.spreadTimeline).not.toHaveLength(0);
      expect(result.spreadTimeline[0]).toMatchObject({
        timestamp: expect.any(String),
        count: expect.any(Number),
        cumulative: expect.any(Number),
      });

      // 检查累积值是否正确
      let lastCumulative = 0;
      for (const point of result.spreadTimeline) {
        expect(point.cumulative).toBeGreaterThanOrEqual(lastCumulative);
        lastCumulative = point.cumulative;
      }
    });

    it('应该按时间正序排列时间线', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost3', userId: 'userC', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 检查时间线是否按时间正序
      const timestamps = result.spreadTimeline.map(p => p.timestamp);
      const sortedTimestamps = [...timestamps].sort();
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('用户类型统计', () => {
    it('应该正确统计各类型用户的转发数', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'VIP User', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost3', userId: 'userC', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost4', userId: 'userD', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T10:15:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

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
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

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

      // 第一次调用
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([{ postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 }]);
      await service.getBreadthAnalysis('event-123');

      // 第二次调用（缓存命中）
      await service.getBreadthAnalysis('event-123');

      // cacheService.getOrSet 应该被调用2次
      expect(callCount).toBe(2);
    });
  });

  describe('边界条件', () => {
    it('应该处理重复转发（同一用户多次转发）', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'post1', repostId: 'repost2', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), rootPostId: 'post1', level: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      expect(result.totalReposts).toBe(2); // 总转发数包含重复
      expect(result.uniqueReposters).toBe(1); // 唯一转发用户数去重
    });

    it('应该处理循环转发（避免无限循环）', async () => {
      const mockReposts = [
        { postId: 'post1', repostId: 'repost1', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), rootPostId: 'post1', level: 1 },
        { postId: 'repost1', repostId: 'repost2', userId: 'userB', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z'), rootPostId: 'post1', level: 2 },
        { postId: 'repost2', repostId: 'repost3', userId: 'userA', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z'), rootPostId: 'post1', level: 3 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

      const result = await service.getBreadthAnalysis('event-123');

      // 应该能够正常完成，不进入无限循环
      expect(result.spreadDepth).toBeGreaterThan(0);
      expect(result.uniqueReposters).toBe(2); // userA 和 userB
    });
  });
});
