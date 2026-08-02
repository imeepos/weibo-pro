import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityEvolutionService } from './community-evolution.service';
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

describe('CommunityEvolutionService', () => {
  let service: CommunityEvolutionService;
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
      getRawOne: vi.fn().mockResolvedValue(null),
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

    service = new CommunityEvolutionService(cacheService);
    vi.clearAllMocks();
  });

  describe('Jaccard 相似度计算', () => {
    it('应该正确计算两个相同集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user1', 'user2', 'user3'];

      const result = service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(1.0);
    });

    it('应该正确计算两个不相交集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user4', 'user5', 'user6'];

      const result = service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(0);
    });

    it('应该正确计算部分重叠集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user2', 'user3', 'user4'];

      const result = service['calculateJaccardSimilarity'](setA, setB);

      // 交集: {user2, user3}, 并集: {user1, user2, user3, user4}
      // J = 2/4 = 0.5
      expect(result).toBe(0.5);
    });

    it('应该正确处理空集合', () => {
      const setA: string[] = [];
      const setB = ['user1', 'user2'];

      const result = service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(0);
    });
  });

  describe('社区匹配算法', () => {
    it('应该正确匹配相似的社区', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5, createdAt: '2024-01-01' },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 3, createdAt: '2024-01-01' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      // 测试匹配逻辑
      const prevCommunities = [
        { id: 'c1', members: [{ userId: 'user1' }, { userId: 'user2' }] }
      ];
      const currCommunities = [
        { id: 'c2', members: [{ userId: 'user1' }, { userId: 'user2' }, { userId: 'user3' }] }
      ];

      const matches = service['matchCommunities'](
        { timestamp: '2024-01-01', communities: prevCommunities as any, modularity: 0, totalMembers: 2 },
        { timestamp: '2024-01-02', communities: currCommunities as any, modularity: 0, totalMembers: 3 },
        0.5
      );

      // 应该匹配到 c1 -> c2 (Jaccard = 2/3 = 0.67 > 0.5)
      expect(matches.has('c1')).toBe(true);
    });

    it('应该拒绝不相似的社区', async () => {
      const prevCommunities = [
        { id: 'c1', members: [{ userId: 'user1' }, { userId: 'user2' }] }
      ];
      const currCommunities = [
        { id: 'c2', members: [{ userId: 'user3' }, { userId: 'user4' }] }
      ];

      const matches = service['matchCommunities'](
        { timestamp: '2024-01-01', communities: prevCommunities as any, modularity: 0, totalMembers: 2 },
        { timestamp: '2024-01-02', communities: currCommunities as any, modularity: 0, totalMembers: 2 },
        0.5
      );

      // 不应该匹配 (Jaccard = 0 < 0.5)
      expect(matches.size).toBe(0);
    });
  });

  describe('演化事件检测 - Birth 事件', () => {
    it('应该检测到新社区出现的 birth 事件', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 5 }],
          modularity: 0,
          totalMembers: 5
        },
        {
          timestamp: '2024-01-02',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 5 },
            { id: 'c2', name: 'Community 2', members: [], size: 3 }
          ],
          modularity: 0,
          totalMembers: 8
        }
      ];

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const birthEvents = events.filter(e => e.type === 'birth');
      expect(birthEvents.length).toBeGreaterThan(0);
      const c2BirthEvent = birthEvents.find(e => e.involvedCommunities.includes('c2'));
      expect(c2BirthEvent).toBeDefined();
    });
  });

  describe('演化事件检测 - Death 事件', () => {
    it('应该检测到社区消失的 death 事件', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 5 },
            { id: 'c2', name: 'Community 2', members: [], size: 3 }
          ],
          modularity: 0,
          totalMembers: 8
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 5 }],
          modularity: 0,
          totalMembers: 5
        }
      ];

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const deathEvents = events.filter(e => e.type === 'death');
      expect(deathEvents.length).toBeGreaterThan(0);
      const c2DeathEvent = deathEvents.find(e => e.involvedCommunities.includes('c2'));
      expect(c2DeathEvent).toBeDefined();
    });
  });

  describe('演化事件检测 - Growth 事件', () => {
    it('应该检测到社区成长的 growth 事件 (>20%)', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 10 }],
          modularity: 0,
          totalMembers: 10
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c2', name: 'Community 2', members: [], size: 15 }],
          modularity: 0,
          totalMembers: 15
        }
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const growthEvents = events.filter(e => e.type === 'growth');
      expect(growthEvents.length).toBeGreaterThan(0);
    });

    it('不应该检测到小幅变化 (<20%)', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 10 }],
          modularity: 0,
          totalMembers: 10
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c2', name: 'Community 2', members: [], size: 11 }],
          modularity: 0,
          totalMembers: 11
        }
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const growthEvents = events.filter(e => e.type === 'growth');
      const shrinkEvents = events.filter(e => e.type === 'shrink');
      expect(growthEvents.length).toBe(0);
      expect(shrinkEvents.length).toBe(0);
    });
  });

  describe('演化事件检测 - Shrink 事件', () => {
    it('应该检测到社区衰退的 shrink 事件 (>20%)', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 15 }],
          modularity: 0,
          totalMembers: 15
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c2', name: 'Community 2', members: [], size: 10 }],
          modularity: 0,
          totalMembers: 10
        }
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const shrinkEvents = events.filter(e => e.type === 'shrink');
      expect(shrinkEvents.length).toBeGreaterThan(0);
    });
  });

  describe('演化事件检测 - Split 事件', () => {
    it('应该检测到社区分裂的 split 事件', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 20 }],
          modularity: 0,
          totalMembers: 20
        },
        {
          timestamp: '2024-01-02',
          communities: [
            { id: 'c2', name: 'Community 2', members: [], size: 10 },
            { id: 'c3', name: 'Community 3', members: [], size: 10 }
          ],
          modularity: 0,
          totalMembers: 20
        }
      ];

      // Mock matchCommunities to return c1 -> [c2, c3]
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));
      vi.spyOn(service as any, 'reverseMatch').mockReturnValue(new Map([['c1', ['c2', 'c3']]]));

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const splitEvents = events.filter(e => e.type === 'split');
      expect(splitEvents.length).toBeGreaterThan(0);
    });
  });

  describe('演化事件检测 - Merge 事件', () => {
    it('应该检测到社区合并的 merge 事件', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 }
          ],
          modularity: 0,
          totalMembers: 20
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c3', name: 'Community 3', members: [], size: 20 }],
          modularity: 0,
          totalMembers: 20
        }
      ];

      // Mock matchCommunities to return c1 -> c3, c2 -> c3
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3'], ['c2', 'c3']])
      );

      const events = service['detectEvolutionEvents'](mockTimeSlices as any);

      const mergeEvents = events.filter(e => e.type === 'merge');
      expect(mergeEvents.length).toBeGreaterThan(0);
    });
  });

  describe('稳定性指数计算', () => {
    it('应该正确计算高稳定性场景', () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 }
          ],
          modularity: 0,
          totalMembers: 20
        },
        {
          timestamp: '2024-01-02',
          communities: [
            { id: 'c3', name: 'Community 3', members: [], size: 10 },
            { id: 'c4', name: 'Community 4', members: [], size: 10 }
          ],
          modularity: 0,
          totalMembers: 20
        }
      ];

      // Mock matchCommunities to return all matches
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3'], ['c2', 'c4']])
      );

      const stability = service['calculateOverallStability'](mockTimeSlices as any);

      // 2个社区都匹配，稳定性 = 1.0
      expect(stability).toBe(1.0);
    });

    it('应该正确计算低稳定性场景', () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 }
          ],
          modularity: 0,
          totalMembers: 20
        },
        {
          timestamp: '2024-01-02',
          communities: [{ id: 'c3', name: 'Community 3', members: [], size: 10 }],
          modularity: 0,
          totalMembers: 10
        }
      ];

      // Mock matchCommunities to return only 1 match
      vi.spyOn(service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3']])
      );

      const stability = service['calculateOverallStability'](mockTimeSlices as any);

      // 1/2 = 0.5
      expect(stability).toBe(0.5);
    });

    it('应该正确处理单个时间切片', () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 10 }],
          modularity: 0,
          totalMembers: 10
        }
      ];

      const stability = service['calculateOverallStability'](mockTimeSlices as any);

      // 单个时间切片，稳定性为 1.0
      expect(stability).toBe(1.0);
    });
  });

  describe('趋势预测', () => {
    it('应该预测社区数量趋势', async () => {
      const mockTimeSlices = [
        {
          timestamp: '2024-01-01',
          communities: [{ id: 'c1', name: 'Community 1', members: [], size: 10 }],
          modularity: 0.5,
          totalMembers: 10
        },
        {
          timestamp: '2024-01-02',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 5 }
          ],
          modularity: 0.6,
          totalMembers: 15
        },
        {
          timestamp: '2024-01-03',
          communities: [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 5 },
            { id: 'c3', name: 'Community 3', members: [], size: 3 }
          ],
          modularity: 0.7,
          totalMembers: 18
        }
      ];

      const prediction = service['predictTrend'](mockTimeSlices as any);

      // 社区数量呈上升趋势，预测应该增加
      expect(prediction.predictedCommunityCount).toBeGreaterThanOrEqual(3);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('缓存行为', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        timeSlices: [],
        evolutionEvents: [],
        overallStability: 0.8,
        keyChanges: [],
        trendPrediction: {
          predictedCommunityCount: 5,
          predictedModularity: 0.6,
          confidence: 0.7
        }
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getCommunityEvolutionAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'community:evolution:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });

  describe('边界条件', () => {
    it('应该正确处理无数据场景', async () => {
      // Mock getRawOne to return null (no event found)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null);

      const result = await service.getCommunityEvolutionAnalysis('event-123');

      expect(result.timeSlices).toEqual([]);
      expect(result.evolutionEvents).toEqual([]);
      expect(result.overallStability).toBe(0);
    });

    it('应该正确处理单个时间切片', async () => {
      // Mock getRawOne to return event time range
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({
        startTime: '2024-01-01',
        endTime: '2024-01-02'
      });

      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5, createdAt: '2024-01-01' }
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await service.getCommunityEvolutionAnalysis('event-123');

      // 单个时间切片应该有默认结构
      expect(result).toBeDefined();
      expect(result.overallStability).toBeGreaterThanOrEqual(0);
      expect(result.overallStability).toBeLessThanOrEqual(1);
    });
  });
});
