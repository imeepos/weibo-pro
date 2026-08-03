import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityEvolutionService } from './community-evolution.service';
import { mockEntityManager } from '../../test-setup';
import {
  createTestService,
  CommunityEvolutionTestContext,
} from './community-evolution.test-helper';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('CommunityEvolutionService - 缓存与边界条件', () => {
  let ctx: CommunityEvolutionTestContext;

  beforeEach(() => {
    ctx = createTestService();
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
          confidence: 0.7,
        },
      };

      vi.spyOn(ctx.cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await ctx.service.getCommunityEvolutionAnalysis('event-123');

      expect(ctx.cacheService.getOrSet).toHaveBeenCalledWith(
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
      ctx.mockQueryBuilder.getRawOne.mockResolvedValueOnce(null);

      const result = await ctx.service.getCommunityEvolutionAnalysis('event-123');

      expect(result.timeSlices).toEqual([]);
      expect(result.evolutionEvents).toEqual([]);
      expect(result.overallStability).toBe(0);
    });

    it('应该正确处理单个时间切片', async () => {
      // Mock getRawOne to return event time range
      ctx.mockQueryBuilder.getRawOne.mockResolvedValueOnce({
        startTime: '2024-01-01',
        endTime: '2024-01-02',
      });

      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5, createdAt: '2024-01-01' }
      ];

      ctx.mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      const result = await ctx.service.getCommunityEvolutionAnalysis('event-123');

      // 单个时间切片应该有默认结构
      expect(result).toBeDefined();
      expect(result.overallStability).toBeGreaterThanOrEqual(0);
      expect(result.overallStability).toBeLessThanOrEqual(1);
    });
  });
});
