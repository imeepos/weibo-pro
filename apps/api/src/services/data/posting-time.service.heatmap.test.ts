import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostingTimeService } from './posting-time.service';
import { mockEntityManager } from '../../test-setup';
import {
  setupPostingTimeTest,
  createPost,
} from './posting-time.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('PostingTimeService', () => {
  let service: PostingTimeService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupPostingTimeTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('热力矩阵生成', () => {
    it('应该正确生成7x24热力矩阵', async () => {
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-15T09:00:00+08:00') }), // 周一 9点
        createPost({ id: '2', created_at: new Date('2024-01-15T14:00:00+08:00') }), // 周一 14点
        createPost({ id: '3', created_at: new Date('2024-01-16T09:00:00+08:00') }), // 周二 9点
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.heatmapMatrix).toHaveLength(7);
      expect(result.heatmapMatrix[0]).toHaveLength(24);
      // 周一(1) 9点有1条
      expect(result.heatmapMatrix[1]![9]).toBe(1);
      // 周一(1) 14点有1条
      expect(result.heatmapMatrix[1]![14]).toBe(1);
      // 周二(2) 9点有1条
      expect(result.heatmapMatrix[2]![9]).toBe(1);
    });

    it('应该正确归一化热力矩阵', async () => {
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-15T09:00:00+08:00') }), // 3条
        createPost({ id: '2', created_at: new Date('2024-01-15T09:30:00+08:00') }),
        createPost({ id: '3', created_at: new Date('2024-01-15T09:45:00+08:00') }),
        createPost({ id: '4', created_at: new Date('2024-01-15T14:00:00+08:00') }), // 1条
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      // 最大值是3，所以归一化后应该是 1.0
      const max9 = result.heatmapMatrix[1]![9];
      const max14 = result.heatmapMatrix[1]![14];
      expect(max9).toBe(1.0);
      expect(max14).toBeCloseTo(0.333, 2);
    });
  });

  describe('峰值和低谷识别', () => {
    it('应该正确识别峰值时间', async () => {
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-15T09:00:00+08:00') }),
        createPost({ id: '2', created_at: new Date('2024-01-15T09:30:00+08:00') }),
        createPost({ id: '3', created_at: new Date('2024-01-15T14:00:00+08:00') }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.peakTime.hour).toBe(9);
      expect(result.peakTime.weekday).toBe(1); // 周一
      expect(result.peakTime.count).toBe(2);
      expect(result.peakTime.label).toBe('周一 09:00');
    });

    it('应该正确识别低谷时间', async () => {
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-15T09:00:00+08:00') }), // 2条
        createPost({ id: '2', created_at: new Date('2024-01-15T09:30:00+08:00') }),
        createPost({ id: '3', created_at: new Date('2024-01-15T14:00:00+08:00') }), // 1条
        createPost({ id: '4', created_at: new Date('2024-01-15T18:00:00+08:00') }), // 1条
        createPost({ id: '5', created_at: new Date('2024-01-15T23:00:00+08:00') }), // 1条（更晚）
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      // 9:00 有2条（峰值），14:00, 18:00, 23:00 各有1条
      // 算法会找到所有168个时间点中的最小值，包括未发帖的时间点（count=0）
      // 所以低谷应该是某个未发帖的时间段
      expect(result.offPeakTime.count).toBe(0);
      // 验证结构正确
      expect(result.offPeakTime.hour).toBeGreaterThanOrEqual(0);
      expect(result.offPeakTime.hour).toBeLessThanOrEqual(23);
      expect(result.offPeakTime.weekday).toBeGreaterThanOrEqual(0);
      expect(result.offPeakTime.weekday).toBeLessThanOrEqual(6);
    });
  });
});
