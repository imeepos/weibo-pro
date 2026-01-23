import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SentimentTransitionService } from './sentiment-transition.service';
import { CacheService } from '../cache.service';
import { useEntityManager } from '@sker/entities';

vi.mock('@sker/entities', () => ({
  useEntityManager: vi.fn(),
}));

describe('SentimentTransitionService', () => {
  let service: SentimentTransitionService;
  let mockCacheService: any;

  beforeEach(() => {
    mockCacheService = {
      getOrSet: vi.fn(),
    };
    service = new SentimentTransitionService(mockCacheService);
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
        });
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
        });
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
      const mockData = [
        { hour: '2024-01-01 10:00:00', positive: 15, negative: 2, neutral: 1 },
        { hour: '2024-01-01 11:00:00', positive: 3, negative: 14, neutral: 1 },
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
        });
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
