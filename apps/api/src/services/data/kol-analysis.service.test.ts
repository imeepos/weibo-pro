import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KOLAnalysisService } from './kol-analysis.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { WeiboUserEntity } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';

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
    // 创建 mock query builder
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
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

    service = new KOLAnalysisService(cacheService);
    vi.clearAllMocks();
  });

  describe('calculateInfluenceScore', () => {
    it('should calculate influence score for verified user with followers', () => {
      const user = {
        followers_count: 10000,
        statuses_count: 100,
        verified: true,
      };

      const engagement = {
        totalReposts: 500,
        totalComments: 300,
        totalLikes: 200,
        totalPosts: 100,
      };

      const score = service.calculateInfluenceScore(user, engagement);

      // influenceScore = log(followers) * 0.3 + (reposts + comments + likes) / posts * 0.4 + verifiedBonus * 0.3
      // = log(10000) * 0.3 + (500 + 300 + 200) / 100 * 0.4 + 1 * 0.3
      // = 9.21 * 0.3 + 10 * 0.4 + 0.3
      // = 2.763 + 4 + 0.3 = 7.063
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should calculate influence score for unverified user', () => {
      const user = {
        followers_count: 5000,
        statuses_count: 50,
        verified: false,
      };

      const engagement = {
        totalReposts: 100,
        totalComments: 50,
        totalLikes: 30,
        totalPosts: 50,
      };

      const score = service.calculateInfluenceScore(user, engagement);

      // Unverified user should have lower score
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should handle user with zero followers', () => {
      const user = {
        followers_count: 0,
        statuses_count: 10,
        verified: false,
      };

      const engagement = {
        totalReposts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalPosts: 10,
      };

      const score = service.calculateInfluenceScore(user, engagement);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle division by zero for posts', () => {
      const user = {
        followers_count: 1000,
        statuses_count: 0,
        verified: true,
      };

      const engagement = {
        totalReposts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalPosts: 0,
      };

      const score = service.calculateInfluenceScore(user, engagement);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      const engagement = {
        totalReposts: 100,
        totalComments: 50,
        totalLikes: 30,
        totalPosts: 10,
        followersCount: 1000,
      };

      const rate = service.calculateEngagementRate(engagement);

      // engagementRate = (reposts + comments + likes) / (posts * followers)
      // = (100 + 50 + 30) / (10 * 1000) = 180 / 10000 = 0.018
      expect(rate).toBe(0.018);
    });

    it('should handle zero followers', () => {
      const engagement = {
        totalReposts: 100,
        totalComments: 50,
        totalLikes: 30,
        totalPosts: 10,
        followersCount: 0,
      };

      const rate = service.calculateEngagementRate(engagement);
      expect(rate).toBe(0);
    });

    it('should handle zero posts', () => {
      const engagement = {
        totalReposts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalPosts: 0,
        followersCount: 1000,
      };

      const rate = service.calculateEngagementRate(engagement);
      expect(rate).toBe(0);
    });
  });

  describe('calculateParetoIndex', () => {
    it('should calculate pareto index for top 20% users', () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        userId: `user${i}`,
        totalEngagement: (i + 1) * 10, // 10, 20, 30, ..., 1000
      }));

      const paretoIndex = service.calculateParetoIndex(users, 0.2);

      // Top 20 users should contribute more than 20% of total engagement
      expect(paretoIndex).toBeGreaterThan(0);
      expect(paretoIndex).toBeLessThanOrEqual(1);
    });

    it('should return 1 when all engagement from top users', () => {
      const users = [
        { userId: 'user1', totalEngagement: 100 },
        { userId: 'user2', totalEngagement: 0 },
        { userId: 'user3', totalEngagement: 0 },
      ];

      const paretoIndex = service.calculateParetoIndex(users, 0.33); // top 1/3
      expect(paretoIndex).toBe(1);
    });

    it('should return 0 when no engagement data', () => {
      const users = [
        { userId: 'user1', totalEngagement: 0 },
        { userId: 'user2', totalEngagement: 0 },
      ];

      const paretoIndex = service.calculateParetoIndex(users, 0.5);
      expect(paretoIndex).toBe(0);
    });

    it('should handle empty user list', () => {
      const paretoIndex = service.calculateParetoIndex([], 0.2);
      expect(paretoIndex).toBe(0);
    });
  });

  describe('getKOLAnalysis', () => {
    it('should return KOL analysis with top KOLs', async () => {
      const mockUserStats = [
        {
          user_id: '1',
          screen_name: 'KOL1',
          followers_count: 100000,
          verified: true,
          total_reposts: 1000,
          total_comments: 500,
          total_likes: 300,
          total_posts: 50,
        },
        {
          user_id: '2',
          screen_name: 'KOL2',
          followers_count: 50000,
          verified: true,
          total_reposts: 500,
          total_comments: 300,
          total_likes: 200,
          total_posts: 30,
        },
      ];

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
      const mockUserStats = [
        {
          user_id: '1',
          screen_name: 'KOL1',
          followers_count: 100000,
          verified: true,
          total_reposts: 1000,
          total_comments: 500,
          total_likes: 300,
          total_posts: 50,
        },
        {
          user_id: '2',
          screen_name: 'User2',
          followers_count: 1000,
          verified: false,
          total_reposts: 10,
          total_comments: 5,
          total_likes: 3,
          total_posts: 5,
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockUserStats);

      const result = await service.getKOLAnalysis('event-123');

      // KOL contribution should be calculated based on engagement
      expect(result.kolContributionRatio).toBeGreaterThan(0);
      expect(result.kolContributionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateSentimentImpact', () => {
    it('should calculate sentiment impact', () => {
      const sentimentData = {
        positivePosts: 80,
        negativePosts: 20,
        totalPosts: 100,
        avgSentiment: 0.6,
      };

      const impact = service.calculateSentimentImpact(sentimentData);

      expect(impact).toBeGreaterThanOrEqual(-1);
      expect(impact).toBeLessThanOrEqual(1);
    });

    it('should handle neutral sentiment', () => {
      const sentimentData = {
        positivePosts: 50,
        negativePosts: 50,
        totalPosts: 100,
        avgSentiment: 0,
      };

      const impact = service.calculateSentimentImpact(sentimentData);
      expect(impact).toBe(0);
    });

    it('should handle empty sentiment data', () => {
      const sentimentData = {
        positivePosts: 0,
        negativePosts: 0,
        totalPosts: 0,
        avgSentiment: 0,
      };

      const impact = service.calculateSentimentImpact(sentimentData);
      expect(impact).toBe(0);
    });
  });
});
