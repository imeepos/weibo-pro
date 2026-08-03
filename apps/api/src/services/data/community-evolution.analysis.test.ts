import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityEvolutionService } from './community-evolution.service';
import { mockEntityManager } from '../../test-setup';
import {
  createTestService,
  makeTimeSlice,
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

describe('CommunityEvolutionService - 稳定性与趋势分析', () => {
  let ctx: CommunityEvolutionTestContext;

  beforeEach(() => {
    ctx = createTestService();
  });

  describe('稳定性指数计算', () => {
    it('应该正确计算高稳定性场景', () => {
      const mockTimeSlices = [
        makeTimeSlice(
          '2024-01-01',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 },
          ],
          { totalMembers: 20 }
        ),
        makeTimeSlice(
          '2024-01-02',
          [
            { id: 'c3', name: 'Community 3', members: [], size: 10 },
            { id: 'c4', name: 'Community 4', members: [], size: 10 },
          ],
          { totalMembers: 20 }
        ),
      ];

      // Mock matchCommunities to return all matches
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3'], ['c2', 'c4']])
      );

      const stability = ctx.service['calculateOverallStability'](mockTimeSlices as any);

      // 2个社区都匹配，稳定性 = 1.0
      expect(stability).toBe(1.0);
    });

    it('应该正确计算低稳定性场景', () => {
      const mockTimeSlices = [
        makeTimeSlice(
          '2024-01-01',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 },
          ],
          { totalMembers: 20 }
        ),
        makeTimeSlice('2024-01-02', [{ id: 'c3', name: 'Community 3', members: [], size: 10 }], {
          totalMembers: 10,
        }),
      ];

      // Mock matchCommunities to return only 1 match
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3']])
      );

      const stability = ctx.service['calculateOverallStability'](mockTimeSlices as any);

      // 1/2 = 0.5
      expect(stability).toBe(0.5);
    });

    it('应该正确处理单个时间切片', () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 10 }], {
          totalMembers: 10,
        }),
      ];

      const stability = ctx.service['calculateOverallStability'](mockTimeSlices as any);

      // 单个时间切片，稳定性为 1.0
      expect(stability).toBe(1.0);
    });
  });

  describe('趋势预测', () => {
    it('应该预测社区数量趋势', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 10 }], {
          modularity: 0.5,
          totalMembers: 10,
        }),
        makeTimeSlice(
          '2024-01-02',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 5 },
          ],
          { modularity: 0.6, totalMembers: 15 }
        ),
        makeTimeSlice(
          '2024-01-03',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 5 },
            { id: 'c3', name: 'Community 3', members: [], size: 3 },
          ],
          { modularity: 0.7, totalMembers: 18 }
        ),
      ];

      const prediction = ctx.service['predictTrend'](mockTimeSlices as any);

      // 社区数量呈上升趋势，预测应该增加
      expect(prediction.predictedCommunityCount).toBeGreaterThanOrEqual(3);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });
});
