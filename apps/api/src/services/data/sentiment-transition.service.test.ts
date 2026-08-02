import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EntityManager } from 'typeorm';
import { SentimentTransitionService } from './sentiment-transition.service';
import { useEntityManager, } from '@sker/entities';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

// Mock LLM analyzer service
vi.mock('./sentiment-transition-llm-analyzer.service', () => ({
  SentimentTransitionLLMAnalyzerService: vi.fn().mockImplementation(() => ({
    analyzeTurningPoint: vi.fn().mockResolvedValue({
      triggerKeywords: ['测试', '关键词'],
      triggerPosts: ['post1', 'post2'],
    }),
  })),
}));

describe('SentimentTransitionService', () => {
  let service: SentimentTransitionService;
  let mockCacheService: any;
  let mockLLMAnalyzer: any;

  beforeEach(() => {
    mockCacheService = {
      getOrSet: vi.fn(),
    };
    mockLLMAnalyzer = {
      analyzeTurningPoint: vi.fn().mockResolvedValue({
        triggerKeywords: ['测试', '关键词'],
        triggerPosts: ['post1', 'post2'],
      }),
    };
    service = new SentimentTransitionService(mockCacheService, mockLLMAnalyzer);
  });

  describe('getSentimentTransitionAnalysis', () => {
    it('should return default structure for empty data', async () => {
      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              addSelect: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              groupBy: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              getRawMany: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as unknown as EntityManager);
      });

      // 让缓存调用回调函数
      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getSentimentTransitionAnalysis('test-event-id');

      expect(result.timeline).toEqual([]);
      expect(result.turningPoints).toEqual([]);
      expect(result.stabilityIndex).toBe(0);
      expect(result.polarizationIndex).toBe(0);
      expect(result.transitionMatrix).toEqual({
        positiveToPositive: 0,
        positiveToNegative: 0,
        positiveToNeutral: 0,
        negativeToPositive: 0,
        negativeToNegative: 0,
        negativeToNeutral: 0,
        neutralToPositive: 0,
        neutralToNegative: 0,
        neutralToNeutral: 0,
      });
    });

    it('should calculate transition matrix correctly', async () => {
      const mockData = [
        {
          hour: '2024-01-01 10:00:00',
          positive: 10,
          negative: 5,
          neutral: 3,
        },
        {
          hour: '2024-01-01 11:00:00',
          positive: 8,
          negative: 7,
          neutral: 3,
        },
      ];

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              addSelect: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              groupBy: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              getRawMany: vi.fn().mockResolvedValue(mockData),
            }),
          }),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getSentimentTransitionAnalysis('test-event-id');

      expect(result.transitionMatrix).toBeDefined();
      // 验证转变概率总和为 1
      const totalPositive = result.transitionMatrix.positiveToPositive +
        result.transitionMatrix.positiveToNegative +
        result.transitionMatrix.positiveToNeutral;
      expect(totalPositive).toBeCloseTo(1, 1);
    });

    it('should detect turning points', async () => {
      // 提供足够的数据点以检测转折点（至少需要 7 个点，windowSize=3）
      const mockData = [
        { hour: '2024-01-01 10:00:00', positive: 15, negative: 2, neutral: 1 },
        { hour: '2024-01-01 11:00:00', positive: 14, negative: 3, neutral: 1 },
        { hour: '2024-01-01 12:00:00', positive: 13, negative: 4, neutral: 1 },
        { hour: '2024-01-01 13:00:00', positive: 3, negative: 14, neutral: 1 }, // 转折点
        { hour: '2024-01-01 14:00:00', positive: 2, negative: 15, neutral: 1 },
        { hour: '2024-01-01 15:00:00', positive: 2, negative: 16, neutral: 1 },
        { hour: '2024-01-01 16:00:00', positive: 1, negative: 17, neutral: 1 },
      ];

      vi.mocked(useEntityManager).mockImplementation(async (callback) => {
        return callback({
          getRepository: vi.fn().mockReturnValue({
            createQueryBuilder: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              addSelect: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              groupBy: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              getRawMany: vi.fn().mockResolvedValue(mockData),
            }),
          }),
        } as unknown as EntityManager);
      });

      mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
        return factory();
      });

      const result = await service.getSentimentTransitionAnalysis('test-event-id');

      expect(result.turningPoints.length).toBeGreaterThan(0);
      expect(result.turningPoints[0]).toMatchObject({
        fromSentiment: 'positive',
        toSentiment: 'negative',
      });
    });

    it('should use cache correctly', async () => {
      mockCacheService.getOrSet.mockResolvedValue({
        timeline: [],
        transitionMatrix: expect.any(Object),
        turningPoints: [],
        stabilityIndex: 0,
        polarizationIndex: 0,
      });

      await service.getSentimentTransitionAnalysis('test-event-id');

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('sentiment:transition'),
        expect.any(Function),
        expect.any(Number)
      );
    });
  });
});
