import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkCentralityService } from './network-centrality.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { UserRelationStatistics } from '@sker/entities';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('NetworkCentralityService', () => {
  let service: NetworkCentralityService;
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
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
      return fn();
    });

    service = new NetworkCentralityService(cacheService);
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('应该返回默认结构当事件没有网络数据', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getCentralityAnalysis('event-123');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.networkStats.nodeCount).toBe(0);
      expect(result.networkStats.edgeCount).toBe(0);
      expect(result.networkStats.avgDegree).toBe(0);
      expect(result.networkStats.maxDegree).toBe(0);
      expect(result.networkStats.density).toBe(0);
      expect(result.topInfluencers).toEqual([]);
    });

    it('应该正确处理单节点网络', async () => {
      // 单节点意味着只有一条关系（用户A -> 用户B）
      const mockRelations = [{
        sourceUserId: 'user1',
        targetUserId: 'user2',
        totalWeight: 5,
      }];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // 2个节点，1条边
      expect(result.networkStats.nodeCount).toBe(2);
      expect(result.networkStats.edgeCount).toBe(1);
      expect(result.nodes).toHaveLength(2);

      // 检查度中心性
      const user1Node = result.nodes.find(n => n.userId === 'user1');
      const user2Node = result.nodes.find(n => n.userId === 'user2');

      expect(user1Node?.degreeCentrality).toBe(1); // 1 / (2-1) = 1
      expect(user2Node?.degreeCentrality).toBe(1); // 1 / (2-1) = 1

      // 检查网络密度
      expect(result.networkStats.density).toBe(1); // 1 / (2*1/2) = 1
    });

    it('应该正确处理两节点网络', async () => {
      // 多个用户的多条关系
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 3 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 2 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // 3个节点，3条边
      expect(result.networkStats.nodeCount).toBe(3);
      expect(result.networkStats.edgeCount).toBe(3);

      // user1 的度中心性 = 2 / (3-1) = 1
      const user1Node = result.nodes.find(n => n.userId === 'user1');
      expect(user1Node?.degreeCentrality).toBe(1);
    });
  });

  describe('度中心性计算', () => {
    it('应该正确计算度中心性', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 1 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 1 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // user1: degree=2, centrality=2/2=1
      // user2: degree=2, centrality=2/2=1
      // user3: degree=2, centrality=2/2=1
      result.nodes.forEach(node => {
        expect(node.degreeCentrality).toBe(1);
      });
    });
  });

  describe('加权度计算', () => {
    it('应该正确计算加权度', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // user1: weightedDegree = 10 + 5 = 15
      // user2: weightedDegree = 10
      // user3: weightedDegree = 5
      const user1Node = result.nodes.find(n => n.userId === 'user1');
      const user2Node = result.nodes.find(n => n.userId === 'user2');
      const user3Node = result.nodes.find(n => n.userId === 'user3');

      expect(user1Node?.weightedDegree).toBe(15);
      expect(user2Node?.weightedDegree).toBe(10);
      expect(user3Node?.weightedDegree).toBe(5);
    });
  });

  describe('影响力得分计算', () => {
    it('应该正确计算综合影响力得分', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      const user1Node = result.nodes.find(n => n.userId === 'user1');
      // degreeCentrality = 1, normalizedWeight = 15/15 = 1
      // influenceScore = 1 * 0.4 + 1 * 0.6 = 1
      expect(user1Node?.influenceScore).toBe(1);
    });
  });

  describe('网络统计', () => {
    it('应该正确计算网络密度', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // 2个节点，1条边，最大可能边数 = 1
      // density = 1/1 = 1
      expect(result.networkStats.density).toBe(1);
    });

    it('应该正确计算平均度数', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 1 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // 3个节点，2条边
      // avgDegree = (2 * 2) / 3 = 1.33
      expect(result.networkStats.avgDegree).toBeCloseTo(1.33, 1);
    });
  });

  describe('Top 影响力用户', () => {
    it('应该正确排序 Top 影响力用户', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
        { sourceUserId: 'user1', targetUserId: 'user3', totalWeight: 5 },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 1 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // user1 应该是第一名（影响力最高）
      expect(result.topInfluencers[0]?.userId).toBe('user1');
      expect(result.topInfluencers[0]?.rank).toBe(1);
    });

    it('应该正确映射节点大小', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 10 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // nodeSize = 5 + influenceScore * 45
      // influenceScore = 1, nodeSize = 50
      const user1Node = result.nodes.find(n => n.userId === 'user1');
      expect(user1Node?.nodeSize).toBe(50);
    });
  });

  describe('边界条件', () => {
    it('应该正确处理孤立节点', async () => {
      // 只有自环的情况（虽然实际中不应该出现）
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user1', totalWeight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCentralityAnalysis('event-123');

      // 1个节点
      expect(result.networkStats.nodeCount).toBe(1);
      // 单节点网络，度中心性应该为 0
      const user1Node = result.nodes.find(n => n.userId === 'user1');
      expect(user1Node?.degreeCentrality).toBe(0);
    });

    it('应该使用缓存', async () => {
      const cachedData = {
        nodes: [{ userId: 'cached', screenName: 'cached', degreeCentrality: 0, weightedDegree: 0, influenceScore: 0, nodeSize: 5 }],
        edges: [],
        networkStats: { nodeCount: 1, edgeCount: 0, avgDegree: 0, maxDegree: 0, density: 0 },
        topInfluencers: [],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getCentralityAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'network:centrality:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });
});
