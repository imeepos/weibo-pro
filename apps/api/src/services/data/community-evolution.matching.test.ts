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

describe('CommunityEvolutionService - Jaccard 相似度与社区匹配', () => {
  let ctx: CommunityEvolutionTestContext;

  beforeEach(() => {
    ctx = createTestService();
  });

  describe('Jaccard 相似度计算', () => {
    it('应该正确计算两个相同集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user1', 'user2', 'user3'];

      const result = ctx.service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(1.0);
    });

    it('应该正确计算两个不相交集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user4', 'user5', 'user6'];

      const result = ctx.service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(0);
    });

    it('应该正确计算部分重叠集合的 Jaccard 相似度', () => {
      const setA = ['user1', 'user2', 'user3'];
      const setB = ['user2', 'user3', 'user4'];

      const result = ctx.service['calculateJaccardSimilarity'](setA, setB);

      // 交集: {user2, user3}, 并集: {user1, user2, user3, user4}
      // J = 2/4 = 0.5
      expect(result).toBe(0.5);
    });

    it('应该正确处理空集合', () => {
      const setA: string[] = [];
      const setB = ['user1', 'user2'];

      const result = ctx.service['calculateJaccardSimilarity'](setA, setB);

      expect(result).toBe(0);
    });
  });

  describe('社区匹配算法', () => {
    it('应该正确匹配相似的社区', async () => {
      const mockRelations = [
        { sourceUserId: 'user1', targetUserId: 'user2', totalWeight: 5, createdAt: '2024-01-01' },
        { sourceUserId: 'user2', targetUserId: 'user3', totalWeight: 3, createdAt: '2024-01-01' },
      ];

      ctx.mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRelations);

      // 测试匹配逻辑
      const prevCommunities = [
        { id: 'c1', members: [{ userId: 'user1' }, { userId: 'user2' }] }
      ];
      const currCommunities = [
        { id: 'c2', members: [{ userId: 'user1' }, { userId: 'user2' }, { userId: 'user3' }] }
      ];

      const matches = ctx.service['matchCommunities'](
        makeTimeSlice('2024-01-01', prevCommunities as any, { totalMembers: 2 }),
        makeTimeSlice('2024-01-02', currCommunities as any, { totalMembers: 3 }),
        0.5
      );

      // 应该匹配到 c1 -> c2 (Jaccard = 2/3 = 0.67 > 0.5)
      expect(matches.has('c1')).toBe(true);
    });

    it('应该拒绝不相似的社区', async () => {
      const prevCommunities = [
        { id: 'c1', members: [{ userId: 'user1' }, { userId: 'user2' }] }
      ];
      const currCommunities = [
        { id: 'c2', members: [{ userId: 'user3' }, { userId: 'user4' }] }
      ];

      const matches = ctx.service['matchCommunities'](
        makeTimeSlice('2024-01-01', prevCommunities as any, { totalMembers: 2 }),
        makeTimeSlice('2024-01-02', currCommunities as any, { totalMembers: 2 }),
        0.5
      );

      // 不应该匹配 (Jaccard = 0 < 0.5)
      expect(matches.size).toBe(0);
    });
  });
});
