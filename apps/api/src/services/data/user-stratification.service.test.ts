import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStratificationService } from './user-stratification.service';
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

describe('UserStratificationService', () => {
  let service: UserStratificationService;
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
    });

    // 创建 mock cache service
    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
      return fn();
    });

    service = new UserStratificationService(cacheService);
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('应该返回默认分层结构当事件没有用户互动数据', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getUserStratification('event-123');

      expect(result.layers).toHaveLength(4);
      expect(result.totalUsers).toBe(0);
      expect(result.engagementGini).toBe(0);
      expect(result.summary.coreRatio).toBe(0);
      expect(result.summary.activeRatio).toBe(0);
      expect(result.summary.paretoIndex).toBe(0);
    });

    it('应该正确分类单个用户', async () => {
      const mockUserData = [{
        target_user_id: 'user1',
        total_weight: 15,
      }];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      expect(result.totalUsers).toBe(1);
      expect(result.layers[0].count).toBe(1); // core layer
      expect(result.layers[0].name).toBe('core');
    });

    it('应该按权重正确分层多个用户', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 15 },  // core
        { target_user_id: 'user2', total_weight: 8 },   // active
        { target_user_id: 'user3', total_weight: 2 },   // casual
        { target_user_id: 'user4', total_weight: 0 },   // lurker
        { target_user_id: 'user5', total_weight: 20 },  // core
        { target_user_id: 'user6', total_weight: 4 },   // active
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      expect(result.totalUsers).toBe(6);
      expect(result.layers.find(l => l.name === 'core')?.count).toBe(2);
      expect(result.layers.find(l => l.name === 'active')?.count).toBe(2);
      expect(result.layers.find(l => l.name === 'casual')?.count).toBe(1);
      expect(result.layers.find(l => l.name === 'lurker')?.count).toBe(1);
    });
  });

  describe('基尼系数计算', () => {
    it('应该正确计算基尼系数', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 100 },
        { target_user_id: 'user2', total_weight: 50 },
        { target_user_id: 'user3', total_weight: 10 },
        { target_user_id: 'user4', total_weight: 5 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      // 基尼系数应该在 0-1 之间
      expect(result.engagementGini).toBeGreaterThanOrEqual(0);
      expect(result.engagementGini).toBeLessThanOrEqual(1);
      // 数据不均匀，基尼系数应该较高
      expect(result.engagementGini).toBeGreaterThan(0.3);
    });

    it('当所有用户权重相同时基尼系数应该为0', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 10 },
        { target_user_id: 'user2', total_weight: 10 },
        { target_user_id: 'user3', total_weight: 10 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      // 完全平等，基尼系数应该接近 0
      expect(result.engagementGini).toBeLessThan(0.01);
    });

    it('应该处理零权重用户的边界情况', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 0 },
        { target_user_id: 'user2', total_weight: 0 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      expect(result.engagementGini).toBe(0);
    });
  });

  describe('统计指标计算', () => {
    it('应该正确计算核心用户占比', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 15 },  // core
        { target_user_id: 'user2', total_weight: 8 },   // active
        { target_user_id: 'user3', total_weight: 2 },   // casual
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      // 1个核心用户 / 3个总用户 = 33.33%
      expect(result.summary.coreRatio).toBeCloseTo(0.3333, 2);
    });

    it('应该正确计算活跃用户占比', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 15 },  // core
        { target_user_id: 'user2', total_weight: 8 },   // active
        { target_user_id: 'user3', total_weight: 2 },   // casual
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      // (core + active) / total = 2/3 = 66.67%
      expect(result.summary.activeRatio).toBeCloseTo(0.6667, 2);
    });

    it('应该正确计算帕累托指数', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 100 },
        { target_user_id: 'user2', total_weight: 50 },
        { target_user_id: 'user3', total_weight: 30 },
        { target_user_id: 'user4', total_weight: 20 },
        { target_user_id: 'user5', total_weight: 10 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      // 前20%用户(1个)贡献的互动占比 = 100/210 = 47.6%
      expect(result.summary.paretoIndex).toBeCloseTo(0.476, 1);
      expect(result.summary.paretoIndex).toBeGreaterThan(0);
      expect(result.summary.paretoIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('分层验证', () => {
    it('分层百分比总和应该为100%', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 15 },
        { target_user_id: 'user2', total_weight: 8 },
        { target_user_id: 'user3', total_weight: 2 },
        { target_user_id: 'user4', total_weight: 0 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      const totalPercentage = result.layers.reduce((sum, layer) => sum + layer.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('应该正确计算每层的平均互动', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 15 },  // core
        { target_user_id: 'user2', total_weight: 20 },  // core
        { target_user_id: 'user3', total_weight: 5 },   // active
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      const coreLayer = result.layers.find(l => l.name === 'core');
      expect(coreLayer?.avgEngagement).toBe(17.5); // (15 + 20) / 2

      const activeLayer = result.layers.find(l => l.name === 'active');
      expect(activeLayer?.avgEngagement).toBe(5);
    });

    it('应该正确处理边界条件（零权重用户）', async () => {
      const mockUserData = [
        { target_user_id: 'user1', total_weight: 0 },
        { target_user_id: 'user2', total_weight: 0 },
        { target_user_id: 'user3', total_weight: 0 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserData);

      const result = await service.getUserStratification('event-123');

      expect(result.totalUsers).toBe(3);
      expect(result.layers.find(l => l.name === 'lurker')?.count).toBe(3);
      expect(result.engagementGini).toBe(0);
    });
  });

  describe('缓存功能', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        layers: [
          { name: 'core', count: 10, percentage: 20, avgEngagement: 15, color: '#f59e0b' },
        ],
        engagementGini: 0.5,
        totalUsers: 50,
        summary: {
          coreRatio: 0.2,
          activeRatio: 0.5,
          paretoIndex: 0.6,
        },
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getUserStratification('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'user:stratification:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });
});
