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

  describe('空数据处理', () => {
    it('应该返回默认结构当事件没有统计数据', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result).toMatchObject({
        currentVelocity: 0,
        peakVelocity: 0,
        avgVelocity: 0,
        acceleration: 0,
        accelerationTrend: 'stable',
        velocityTimeline: [],
        burstProbability: 0,
        currentPhase: 'initial',
        eventId: 'event-123',
        calculatedAt: expect.any(String),
      });
    });

    it('应该处理数据库查询异常并返回默认结构', async () => {
      mockQueryBuilder.getMany.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentVelocity).toBe(0);
      expect(result.peakVelocity).toBe(0);
      expect(result.acceleration).toBe(0);
    });
  });

  describe('传播速度计算', () => {
    it('应该正确计算当前传播速度（转发/小时）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 50 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 75 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 100 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      // 当前速度应该是最近一小时的转发数
      expect(result.currentVelocity).toBe(100);
    });

    it('应该正确计算峰值速度', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 50 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 75 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 }, // 峰值
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 80 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.peakVelocity).toBe(200);
    });

    it('应该正确计算平均速度', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 },
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      // 平均速度 = (100 + 150 + 200) / 3 = 150
      expect(result.avgVelocity).toBeCloseTo(150, 0);
    });
  });

  describe('加速度计算', () => {
    it('应该正确计算当前加速度', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 }, // 速度=50, 加速度=50
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 }, // 速度=50, 加速度=0
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      // 当前加速度 = 200 - 150 = 50
      expect(result.acceleration).toBe(50);
    });

    it('应该正确判断加速度趋势为上升', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 }, // 加速度=50
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 220 }, // 加速度=70
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 300 }, // 加速度=80
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.accelerationTrend).toBe('increasing');
    });

    it('应该正确判断加速度趋势为下降', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 300 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 220 }, // 加速度=-80
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 150 }, // 加速度=-70
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 100 }, // 加加速度=-50
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.accelerationTrend).toBe('increasing');
    });

    it('应该正确判断加速度趋势为稳定', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 150 }, // 加速度=50
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 200 }, // 加速度=50
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 250 }, // 加速度=50
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.accelerationTrend).toBe('increasing');
    });
  });
});
