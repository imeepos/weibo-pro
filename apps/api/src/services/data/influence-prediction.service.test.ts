import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EntityManager } from 'typeorm';
import { InfluencePredictionService } from './influence-prediction.service';
import { useEntityManager } from '@sker/entities';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('InfluencePredictionService', () => {
  let service: InfluencePredictionService;
  let mockCacheService: any;

  const createMockQueryBuilder = (postData: any[], historicalData: any[] = []) => {
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getRawMany: vi.fn(),
      getRawOne: vi.fn().mockResolvedValue({
        total_posts: postData.length + historicalData.length,
        avg_reposts: 50,
      }),
    };

    // 设置返回值
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(postData);
    if (historicalData.length > 0) {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(historicalData);
    }

    return mockQueryBuilder;
  };

  beforeEach(() => {
    mockCacheService = {
      getOrSet: vi.fn(),
    };
    service = new InfluencePredictionService(mockCacheService);
  });

  describe('getInfluencePredictionAnalysis', () => {
    it('should return default structure for empty data', async () => {
      const mockQueryBuilder = createMockQueryBuilder([]);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.predictedReach).toBe(0);
      expect(result.predictedReposts).toBe(0);
      expect(result.predictedEngagement).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.confidenceLevel).toBe('low');
      expect(result.factors).toHaveLength(7);
      expect(result.similarCases).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it('should calculate influence prediction with valid data', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 10000,
          verified: true,
          text_length: 100,
          pic_num: 2,
          created_at: '2024-01-01 10:00:00',
          reposts_count: 50,
          comments_count: 30,
          attitudes_count: 20,
          keyword: '测试',
        },
      ];

      const mockHistoricalData = [
        {
          post_id: '2',
          keyword: '测试',
          reposts_count: 100,
          comments_count: 60,
          attitudes_count: 40,
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.predictedReach).toBeGreaterThan(0);
      expect(result.predictedReposts).toBeGreaterThan(0);
      expect(result.predictedEngagement).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.factors).toHaveLength(7);
      expect(result.factors[0]!.name).toBe('用户粉丝数');
      expect(result.similarCases.length).toBeGreaterThan(0);
    });

    it('should calculate confidence level correctly', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 50000,
          verified: true,
          text_length: 150,
          pic_num: 3,
          created_at: '2024-01-01 10:00:00',
          reposts_count: 100,
          comments_count: 50,
          attitudes_count: 30,
          keyword: '测试',
        },
      ];

      // 创建足够的历史数据以达到高置信度
      const mockHistoricalData = Array.from({ length: 10 }, (_, i) => ({
        post_id: `post-${i + 2}`,
        keyword: '测试',
        reposts_count: 100,
        comments_count: 50,
        attitudes_count: 30,
      }));

      const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
    });

    it('should extract factors correctly', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 10000,
          verified: true,
          text_length: 100,
          pic_num: 2,
          created_at: '2024-01-01 10:00:00',
          reposts_count: 50,
          comments_count: 30,
          attitudes_count: 20,
          keyword: '测试',
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder(mockPostData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.factors).toHaveLength(7);

      const factorNames = result.factors.map(f => f.name);
      expect(factorNames).toContain('用户粉丝数');
      expect(factorNames).toContain('是否认证');
      expect(factorNames).toContain('内容长度');
      expect(factorNames).toContain('是否有媒体');
      expect(factorNames).toContain('发布时间');
      expect(factorNames).toContain('话题热度');
      expect(factorNames).toContain('初始互动');

      result.factors.forEach(factor => {
        expect(factor.weight).toBeGreaterThan(0);
        expect(factor.value).toBeGreaterThanOrEqual(0);
        expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
      });
    });

    it('should find similar cases correctly', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 10000,
          verified: true,
          text_length: 100,
          pic_num: 2,
          created_at: '2024-01-01 10:00:00',
          reposts_count: 50,
          comments_count: 30,
          attitudes_count: 20,
          keyword: '测试',
        },
      ];

      const mockHistoricalData = [
        {
          post_id: '2',
          keyword: '测试',
          reposts_count: 80,
          comments_count: 40,
          attitudes_count: 30,
        },
        {
          post_id: '3',
          keyword: '其他',
          reposts_count: 20,
          comments_count: 10,
          attitudes_count: 5,
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.similarCases.length).toBeGreaterThan(0);
      result.similarCases.forEach(similarCase => {
        expect(similarCase.postId).toBeDefined();
        expect(similarCase.similarity).toBeGreaterThanOrEqual(0);
        expect(similarCase.similarity).toBeLessThanOrEqual(1);
        expect(similarCase.actualReach).toBeGreaterThanOrEqual(0);
        expect(similarCase.actualReposts).toBeGreaterThanOrEqual(0);
        expect(similarCase.actualEngagement).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate recommendations', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 1000,
          verified: false,
          text_length: 50,
          pic_num: 0,
          created_at: '2024-01-01 03:00:00',
          reposts_count: 5,
          comments_count: 2,
          attitudes_count: 1,
          keyword: '测试',
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder(mockPostData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should use cache correctly', async () => {
      mockCacheService.getOrSet.mockResolvedValue({
        predictedReach: 1000,
        predictedReposts: 100,
        predictedEngagement: 150,
        confidence: 0.8,
        confidenceLevel: 'high',
        factors: [],
        predictionRange: { min: 800, max: 1200, expected: 1000 },
        similarCases: [],
        recommendations: [],
      });

      await service.getInfluencePredictionAnalysis('test-event-id');

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('influence:prediction'),
        expect.any(Function),
        expect.any(Number)
      );
    });

    it('should calculate prediction range correctly', async () => {
      const mockPostData = [
        {
          post_id: '1',
          user_id: '1001',
          followers_count: 10000,
          verified: true,
          text_length: 100,
          pic_num: 2,
          created_at: '2024-01-01 10:00:00',
          reposts_count: 50,
          comments_count: 30,
          attitudes_count: 20,
          keyword: '测试',
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder(mockPostData);

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
          }),
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getInfluencePredictionAnalysis('test-event-id');

      expect(result.predictionRange).toBeDefined();
      expect(result.predictionRange.min).toBeLessThanOrEqual(result.predictionRange.expected);
      expect(result.predictionRange.expected).toBeLessThanOrEqual(result.predictionRange.max);
    });
  });
});
