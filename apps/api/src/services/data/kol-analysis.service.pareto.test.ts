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
});
