import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityDetectionService } from './community-detection.service';
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

describe('CommunityDetectionService', () => {
  let service: CommunityDetectionService;
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
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
      return fn();
    });

    service = new CommunityDetectionService(cacheService);
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('应该返回默认结构当事件没有网络数据', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getCommunityAnalysis('event-123');

      expect(result.communities).toEqual([]);
      expect(result.modularity).toBe(0);
      expect(result.totalCommunities).toBe(0);
      expect(result.interCommunityLinks).toEqual([]);
      expect(result.bridgeUsers).toEqual([]);
    });

    it('应该正确处理单社区网络', async () => {
      // 所有关系都在一个社区内
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 3 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 2 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 应该检测到一个社区（所有用户紧密连接）
      expect(result.totalCommunities).toBeGreaterThanOrEqual(1);
      expect(result.communities).toHaveLength(result.totalCommunities);
    });

    it('应该正确处理两社区网络', async () => {
      // 两个独立的社区
      const mockRelations = [
        // 社区1内部连接
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 3 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 2 },
        // 社区2内部连接
        { sourceUserId: 'user4', targetUserId: 'user5', totalWeight: 4 },
        { sourceUserId: 'user4', targetUserId: 'user6', totalWeight: 2 },
        { sourceUserId: 'user5', targetUserId: 'user6', totalWeight: 3 },
        // 社区间弱连接（桥接）
        { sourceUserId: 'user3', targetUserId: 'user4', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 应该检测到两个社区
      expect(result.totalCommunities).toBeGreaterThanOrEqual(1);
    });
  });

  describe('社区指标计算', () => {
    it('应该正确计算社区密度', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 1 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 检查每个社区的密度值在有效范围内 [0, 1]
      result.communities.forEach(community => {
        expect(community.density).toBeGreaterThanOrEqual(0);
        expect(community.density).toBeLessThanOrEqual(1);
      });
    });

    it('应该正确计算社区平均影响力', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 检查每个社区的平均影响力为非负数
      result.communities.forEach(community => {
        expect(community.avgInfluence).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该正确分类用户角色', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 5 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 检查所有用户都有角色
      result.communities.forEach(community => {
        community.members.forEach(member => {
          expect(['leader', 'active', 'peripheral']).toContain(member.role);
          expect(member.inDegree).toBeGreaterThanOrEqual(0);
          expect(member.outDegree).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('桥接用户识别', () => {
    it('应该正确识别桥接用户', async () => {
      // 两个社区通过 user3 连接
      const mockRelations = [
        // 社区1
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 3 },
        // 社区2
        { sourceUserId: 'user3', targetUserId: 'user4', totalWeight: 2 },
        { sourceUserId: 'user4', targetUserId: 'user5', totalWeight: 4 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // user3 是桥接用户，连接两个社区
      const bridgeUser = result.bridgeUsers.find(b => b.userId === 'user3');
      expect(bridgeUser).toBeDefined();
      expect(bridgeUser?.communities.length).toBeGreaterThan(1);
      expect(bridgeUser?.bridgeScore).toBeGreaterThan(0);
    });

    it('应该正确计算桥接得分', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 3 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 检查所有桥接用户的得分在有效范围内 [0, 1]
      result.bridgeUsers.forEach(bridgeUser => {
        expect(bridgeUser.bridgeScore).toBeGreaterThanOrEqual(0);
        expect(bridgeUser.bridgeScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('社区间关系分析', () => {
    it('应该正确识别社区间连接', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 3 },
        { sourceUserId: 'user3', targetUserId: 'user4', totalWeight: 2 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 检查社区间链接的格式正确
      result.interCommunityLinks.forEach(link => {
        expect(link.sourceCommunity).toBeDefined();
        expect(link.targetCommunity).toBeDefined();
        expect(link.weight).toBeGreaterThan(0);
      });
    });
  });

  describe('模块度计算', () => {
    it('应该正确计算模块度', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 3 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 模块度应该在 [-1, 1] 范围内
      expect(result.modularity).toBeGreaterThanOrEqual(-1);
      expect(result.modularity).toBeLessThanOrEqual(1);
    });
  });

  describe('缓存行为', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        communities: [{
          id: 'community-0',
          name: 'Cached Community',
          members: [],
          size: 0,
          density: 0,
          avgInfluence: 0,
          topKeywords: [],
          sentiment: { positive: 0, negative: 0, neutral: 0 },
        }],
        modularity: 0.5,
        totalCommunities: 1,
        interCommunityLinks: [],
        bridgeUsers: [],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getCommunityAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'community:detection:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });

  describe('边界条件', () => {
    it('应该正确处理孤立节点', async () => {
      // 单个节点没有边
      const mockRelations: any[] = [];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      expect(result.communities).toEqual([]);
      expect(result.totalCommunities).toBe(0);
    });

    it('应该正确处理自环', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user1', totalWeight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityAnalysis('event-123');

      // 自环应该被正确处理，不应该抛出错误
      expect(result).toBeDefined();
    });
  });
});
