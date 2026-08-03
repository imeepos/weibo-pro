import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostingTimeService } from './posting-time.service';
import { CacheService } from '../cache.service';
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
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupPostingTimeTest();
    service = harness.service;
    cacheService = harness.cacheService;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('应该返回默认结构当没有帖子数据', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.totalPosts).toBe(0);
      expect(result.hourlyDistribution).toHaveLength(24);
      expect(result.weekdayDistribution).toHaveLength(7);
      expect(result.heatmapMatrix).toHaveLength(7);
      expect(result.heatmapMatrix[0]).toHaveLength(24);
      expect(result.peakTime.count).toBe(0);
      expect(result.offPeakTime.count).toBe(0);
    });

    it('应该正确统计单个帖子', async () => {
      // 使用本地时间避免时区问题
      const mockPost = createPost({ created_at: new Date('2024-01-15T14:30:00+08:00') }); // 周一 14:30 本地时间

      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPost]);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.totalPosts).toBe(1);
      expect(result.hourlyDistribution[14]).toBe(1);
      expect(result.weekdayDistribution[1]).toBe(1); // 周一
    });

    it('应该正确计算24小时分布', async () => {
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-15T09:00:00+08:00') }),
        createPost({ id: '2', created_at: new Date('2024-01-15T09:30:00+08:00') }),
        createPost({ id: '3', created_at: new Date('2024-01-15T14:00:00+08:00') }),
        createPost({ id: '4', created_at: new Date('2024-01-15T18:00:00+08:00') }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.hourlyDistribution[9]).toBe(2);
      expect(result.hourlyDistribution[14]).toBe(1);
      expect(result.hourlyDistribution[18]).toBe(1);
      expect(result.totalPosts).toBe(4);
    });

    it('应该正确计算7天分布', async () => {
      // 2024-01-14 是周日(0), 2024-01-15 是周一(1)
      const mockPosts = [
        createPost({ id: '1', created_at: new Date('2024-01-14T10:00:00+08:00') }), // 周日
        createPost({ id: '2', created_at: new Date('2024-01-14T12:00:00+08:00') }), // 周日
        createPost({ id: '3', created_at: new Date('2024-01-15T10:00:00+08:00') }), // 周一
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.weekdayDistribution[0]).toBe(2); // 周日
      expect(result.weekdayDistribution[1]).toBe(1); // 周一
    });
  });

  describe('缓存功能', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        hourlyDistribution: new Array(24).fill(0),
        weekdayDistribution: new Array(7).fill(0),
        heatmapMatrix: Array(7).fill(null).map(() => Array(24).fill(0)),
        peakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '',
        },
        offPeakTime: {
          hour: 0,
          weekday: 0,
          count: 0,
          label: '',
        },
        totalPosts: 0,
        insights: [],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'posting:time:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });
});
