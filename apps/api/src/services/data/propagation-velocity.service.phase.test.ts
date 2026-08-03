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

  describe('传播阶段识别', () => {
    it('应该识别为initial阶段（速度很低）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 5 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 8 },
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentPhase).toBe('initial');
    });

    it('应该识别为growth阶段（加速度显著上升）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 100 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 200 }, // 加速度=100
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 350 }, // 加加速度=150
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 550 }, // 加速度=200
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentPhase).toBe('growth');
    });

    it('应该识别为peak阶段（高速度且加速度稳定）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 500 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 520 }, // 加速度=20
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 510 }, // 加加速度=-10
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 515 }, // 加速度=5
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentPhase).toBe('peak');
    });

    it('应该识别为decline阶段（加速度显著下降）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 500 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 400 }, // 加速度=-100
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 280 }, // 加加速度=-120
        { year: 2026, month: 1, day: 23, hour: 13, postCount: 25, repostCount: 150 }, // 加加速度=-130
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentPhase).toBe('decline');
    });

    it('应该识别为stable阶段（低速度且稳定）', async () => {
      const mockData = createHourlyStats([
        { year: 2026, month: 1, day: 23, hour: 10, postCount: 10, repostCount: 50 },
        { year: 2026, month: 1, day: 23, hour: 11, postCount: 15, repostCount: 52 }, // 加速度=2
        { year: 2026, month: 1, day: 23, hour: 12, postCount: 20, repostCount: 48 }, // 加加速度=-4
      ]);

      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockData);

      const result = await service.getVelocityAnalysis('event-123');

      expect(result.currentPhase).toBe('stable');
    });
  });
});
