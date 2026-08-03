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

describe('CommunityEvolutionService - 演化事件检测', () => {
  let ctx: CommunityEvolutionTestContext;

  beforeEach(() => {
    ctx = createTestService();
  });

  describe('演化事件检测 - Birth 事件', () => {
    it('应该检测到新社区出现的 birth 事件', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 5 }], {
          totalMembers: 5,
        }),
        makeTimeSlice(
          '2024-01-02',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 5 },
            { id: 'c2', name: 'Community 2', members: [], size: 3 },
          ],
          { totalMembers: 8 }
        ),
      ];

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const birthEvents = events.filter(e => e.type === 'birth');
      expect(birthEvents.length).toBeGreaterThan(0);
      const c2BirthEvent = birthEvents.find(e => e.involvedCommunities.includes('c2'));
      expect(c2BirthEvent).toBeDefined();
    });
  });

  describe('演化事件检测 - Death 事件', () => {
    it('应该检测到社区消失的 death 事件', async () => {
      const mockTimeSlices = [
        makeTimeSlice(
          '2024-01-01',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 5 },
            { id: 'c2', name: 'Community 2', members: [], size: 3 },
          ],
          { totalMembers: 8 }
        ),
        makeTimeSlice('2024-01-02', [{ id: 'c1', name: 'Community 1', members: [], size: 5 }], {
          totalMembers: 5,
        }),
      ];

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const deathEvents = events.filter(e => e.type === 'death');
      expect(deathEvents.length).toBeGreaterThan(0);
      const c2DeathEvent = deathEvents.find(e => e.involvedCommunities.includes('c2'));
      expect(c2DeathEvent).toBeDefined();
    });
  });

  describe('演化事件检测 - Growth 事件', () => {
    it('应该检测到社区成长的 growth 事件 (>20%)', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 10 }], {
          totalMembers: 10,
        }),
        makeTimeSlice('2024-01-02', [{ id: 'c2', name: 'Community 2', members: [], size: 15 }], {
          totalMembers: 15,
        }),
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const growthEvents = events.filter(e => e.type === 'growth');
      expect(growthEvents.length).toBeGreaterThan(0);
    });

    it('不应该检测到小幅变化 (<20%)', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 10 }], {
          totalMembers: 10,
        }),
        makeTimeSlice('2024-01-02', [{ id: 'c2', name: 'Community 2', members: [], size: 11 }], {
          totalMembers: 11,
        }),
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const growthEvents = events.filter(e => e.type === 'growth');
      const shrinkEvents = events.filter(e => e.type === 'shrink');
      expect(growthEvents.length).toBe(0);
      expect(shrinkEvents.length).toBe(0);
    });
  });

  describe('演化事件检测 - Shrink 事件', () => {
    it('应该检测到社区衰退的 shrink 事件 (>20%)', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 15 }], {
          totalMembers: 15,
        }),
        makeTimeSlice('2024-01-02', [{ id: 'c2', name: 'Community 2', members: [], size: 10 }], {
          totalMembers: 10,
        }),
      ];

      // Mock matchCommunities to return c1 -> c2
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const shrinkEvents = events.filter(e => e.type === 'shrink');
      expect(shrinkEvents.length).toBeGreaterThan(0);
    });
  });

  describe('演化事件检测 - Split 事件', () => {
    it('应该检测到社区分裂的 split 事件', async () => {
      const mockTimeSlices = [
        makeTimeSlice('2024-01-01', [{ id: 'c1', name: 'Community 1', members: [], size: 20 }], {
          totalMembers: 20,
        }),
        makeTimeSlice(
          '2024-01-02',
          [
            { id: 'c2', name: 'Community 2', members: [], size: 10 },
            { id: 'c3', name: 'Community 3', members: [], size: 10 },
          ],
          { totalMembers: 20 }
        ),
      ];

      // Mock matchCommunities to return c1 -> [c2, c3]
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(new Map([['c1', 'c2']]));
      vi.spyOn(ctx.service as any, 'reverseMatch').mockReturnValue(new Map([['c1', ['c2', 'c3']]]));

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const splitEvents = events.filter(e => e.type === 'split');
      expect(splitEvents.length).toBeGreaterThan(0);
    });
  });

  describe('演化事件检测 - Merge 事件', () => {
    it('应该检测到社区合并的 merge 事件', async () => {
      const mockTimeSlices = [
        makeTimeSlice(
          '2024-01-01',
          [
            { id: 'c1', name: 'Community 1', members: [], size: 10 },
            { id: 'c2', name: 'Community 2', members: [], size: 10 },
          ],
          { totalMembers: 20 }
        ),
        makeTimeSlice('2024-01-02', [{ id: 'c3', name: 'Community 3', members: [], size: 20 }], {
          totalMembers: 20,
        }),
      ];

      // Mock matchCommunities to return c1 -> c3, c2 -> c3
      vi.spyOn(ctx.service as any, 'matchCommunities').mockReturnValue(
        new Map([['c1', 'c3'], ['c2', 'c3']])
      );

      const events = ctx.service['detectEvolutionEvents'](mockTimeSlices as any);

      const mergeEvents = events.filter(e => e.type === 'merge');
      expect(mergeEvents.length).toBeGreaterThan(0);
    });
  });
});
