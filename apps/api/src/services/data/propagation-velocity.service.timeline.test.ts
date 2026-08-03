import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropagationVelocityService } from './propagation-velocity.service';
import { mockEntityManager } from '../../test-setup';
import { setupPropagationVelocityTest, createHourlyStats } from './propagation-velocity.service.test-helpers';

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
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupPropagationVelocityTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('时间序列构建', () => {
    it('应该正确构建速度时间线', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.velocityTimeline).toHaveLength(3);
      expect(result.velocityTimeline[0]).toMatchObject({
        timestamp: expect.any(String),
        velocity: 100,
        acceleration: 0,
        cumulativeReposts: 100,
      });
      expect(result.velocityTimeline[1]).toMatchObject({
        velocity: 150,
        acceleration: 50,
        cumulativeReposts: 250,
      });
      expect(result.velocityTimeline[2]).toMatchObject({
        velocity: 200,
        acceleration: 50,
        cumulativeReposts: 450,
      });
    });

    it('时间线应该按时间正序排列', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 80 },
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      const timestamps = result.velocityTimeline.map(p => p.timestamp);
      const sortedTimestamps = [...timestamps].sort();
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('爆发点预测', () => {
    it('应该预测爆发点当加速度持续上升', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 }, // 加速度=50
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 220 }, // 加加速度=70
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 310 }, // 加速度=90
        { year: 2026, month: 1, day: 23, hour: 14, postCount: 30, repostCount: 420 }, // 加加速度=110
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.burstProbability).toBeGreaterThan(0.5);
      expect(result.predictedBurstTime).toBeUndefined();
    });

    it('当加速度稳定时爆发概率应该较低', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 }, // 加速度=50
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 }, // 加速度=50
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.burstProbability).toBeLessThan(0.5);
    });

    it('当加速度下降时爆发概率应该为0', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 300 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 200 }, // 加速度=-100
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 100 }, // 加速度=-100
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.burstProbability).toBe(0);
      expect(result.predictedBurstTime).toBeUndefined();
    });
  });
});
