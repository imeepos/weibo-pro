import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropagationVelocityService } from './propagation-velocity.service';
import { CacheService } from '../cache.service';
import { mockEntityManager } from '../../test-setup';
import { setupPropagationVelocityTest, createHourlyStats } from './propagation-velocity.service.test-helpers';
import type { PropagationVelocityAnalysis } from '@sker/sdk';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('PropagationVelocityService', () => {
  let service: PropagationVelocityService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupPropagationVelocityTest();
    service = harness.service;
    cacheService = harness.cacheService;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('边界情况', () => {
    it('应该处理单数据点的情况', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentVelocity).toBe(100);
      expect(result.peakVelocity).toBe(100);
      expect(result.avgVelocity).toBe(100);
      expect(result.acceleration).toBe(0);
      expect(result.accelerationTrend).toBe('stable');
      expect(result.velocityTimeline).toHaveLength(1);
    });

    it('应该处理两个数据点的情况', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentVelocity).toBe(150);
      expect(result.acceleration).toBe(50);
    });

    it('应该处理有转发但无帖子的情况', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 0, repostCount: 50 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 0, repostCount: 75 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      // 仍然应该能计算速度
      expect(result.currentVelocity).toBe(75);
    });

    it('应该处理所有转发数为0的情况', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 0 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 0 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentVelocity).toBe(0);
      expect(result.peakVelocity).toBe(0);
      expect(result.avgVelocity).toBe(0);
    });
  });

  describe('缓存行为', () => {
    it('应该使用缓存', async () => {
      const cachedData: PropagationVelocityAnalysis = {
        currentVelocity: 100,
        peakVelocity: 200,
        avgVelocity: 150,
        acceleration: 50,
        accelerationTrend: 'increasing',
        velocityTimeline: [],
        burstProbability: 0.8,
        currentPhase: 'growth',
        phaseStartTime: '2026-01-23T10:00:00Z',
        eventId: 'event-123',
        calculatedAt: '2026-01-23T11:00:00Z',
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'propagation:velocity:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });

  describe('时间范围过滤', () => {
    it('应该支持开始时间过滤', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      await service.getVelocityAnalysis('event-123', new Date('2026-01-23T11:00:00Z'));

      // 应该调用andWhere来过滤开始时间
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('>='),
        expect.objectContaining({ startTime: expect.any(Date) })
      );
    });

    it('应该支持结束时间过滤', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      await service.getVelocityAnalysis('event-123', undefined, new Date('2026-01-23T12:00:00Z'));

      // 应该调用andWhere来过滤结束时间
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('<'),
        expect.objectContaining({ endTime: expect.any(Date) })
      );
    });

    it('应该同时支持开始和结束时间过滤', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      await service.getVelocityAnalysis(
        'event-123',
        new Date('2026-01-23T10:30:00Z'),
        new Date('2026-01-23T11:30:00Z')
      );

      // 应该调用两次andWhere
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });
});
