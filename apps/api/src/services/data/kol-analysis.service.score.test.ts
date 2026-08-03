import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KOLAnalysisService } from './kol-analysis.service';
import { mockEntityManager } from '../../test-setup';
import { setupKOLAnalysisTest } from './kol-analysis.service.test-helpers';

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

  beforeEach(() => {
    const harness = setupKOLAnalysisTest();
    service = harness.service;
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
