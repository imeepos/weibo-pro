import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KOLAnalysisService } from './kol-analysis.service';
import { CacheService } from '../cache.service';
import { mockEntityManager } from '../../test-setup';
import {
  setupKOLAnalysisTest,
  createUserStatRows,
} from './kol-analysis.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('KOLAnalysisService', () => {
  let service: KOLAnalysisService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupKOLAnalysisTest();
    service = harness.service;
    cacheService = harness.cacheService;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('getKOLAnalysis', () => {
    it('should return KOL analysis with top KOLs', async () => {
      const mockUserStats = createUserStatRows([
        {
          userId: '1',
          screenName: 'KOL1',
          followersCount: 100000,
          verified: true,
          totalReposts: 1000,
          totalComments: 500,
          totalLikes: 300,
          totalPosts: 50,
        },
        {
          userId: '2',
          screenName: 'KOL2',
          followersCount: 50000,
          verified: true,
          totalReposts: 500,
          totalComments: 300,
          totalLikes: 200,
          totalPosts: 30,
        },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserStats);

      const result = await service.getKOLAnalysis('event-123');

      expect(result.topKOLs).toBeDefined();
      expect(result.topKOLs.length).toBeGreaterThan(0);
      expect(result.paretoIndex).toBeGreaterThanOrEqual(0);
      expect(result.kolContributionRatio).toBeGreaterThanOrEqual(0);
    });

    it('should return empty analysis when no users found', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getKOLAnalysis('event-123');

      expect(result.topKOLs).toEqual([]);
      expect(result.paretoIndex).toBe(0);
      expect(result.kolContributionRatio).toBe(0);
    });

    it('should use cache', async () => {
      const cachedData = {
        topKOLs: [{ userId: '1', screenName: 'Cached', influenceScore: 100 }],
        paretoIndex: 0.8,
        kolContributionRatio: 0.6,
      };
      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getKOLAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'kol:analysis:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });

    it('should calculate KOL contribution ratio correctly', async () => {
      const mockUserStats = createUserStatRows([
        {
          userId: '1',
          screenName: 'KOL1',
          followersCount: 100000,
          verified: true,
          totalReposts: 1000,
          totalComments: 500,
          totalLikes: 300,
          totalPosts: 50,
        },
        {
          userId: '2',
          screenName: 'User2',
          followersCount: 1000,
          verified: false,
          totalReposts: 10,
          totalComments: 5,
          totalLikes: 3,
          totalPosts: 5,
        },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserStats);

      const result = await service.getKOLAnalysis('event-123');

      // KOL contribution should be calculated based on engagement
      expect(result.kolContributionRatio).toBeGreaterThan(0);
      expect(result.kolContributionRatio).toBeLessThanOrEqual(1);
    });
  });
});
