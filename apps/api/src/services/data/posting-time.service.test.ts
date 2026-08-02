import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostingTimeService } from './posting-time.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

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
    // 创建 mock query builder
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      setParameter: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    };

    // 直接 Mock createQueryBuilder 方法
    mockEntityManager.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

    // Mock getRepository to return query builder
    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => mockQueryBuilder),
    } as any);

    // 创建 mock cache service
    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
      return fn();
    });

    service = new PostingTimeService(cacheService);
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
      const mockPost = {
        id: '1',
        event_id: 'event-123',
        created_at: new Date('2024-01-15T14:30:00+08:00'), // 周一 14:30 本地时间
      };

      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPost as any]);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.totalPosts).toBe(1);
      expect(result.hourlyDistribution[14]).toBe(1);
      expect(result.weekdayDistribution[1]).toBe(1); // 周一
    });

    it('应该正确计算24小时分布', async () => {
      const mockPosts = [
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-15T09:00:00+08:00') },
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-15T09:30:00+08:00') },
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-15T14:00:00+08:00') },
        { id: '4', event_id: 'event-123', created_at: new Date('2024-01-15T18:00:00+08:00') },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.hourlyDistribution[9]).toBe(2);
      expect(result.hourlyDistribution[14]).toBe(1);
      expect(result.hourlyDistribution[18]).toBe(1);
      expect(result.totalPosts).toBe(4);
    });

    it('应该正确计算7天分布', async () => {
      // 2024-01-14 是周日(0), 2024-01-15 是周一(1)
      const mockPosts = [
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-14T10:00:00+08:00') }, // 周日
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-14T12:00:00+08:00') }, // 周日
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-15T10:00:00+08:00') }, // 周一
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.weekdayDistribution[0]).toBe(2); // 周日
      expect(result.weekdayDistribution[1]).toBe(1); // 周一
    });
  });

  describe('热力矩阵生成', () => {
    it('应该正确生成7x24热力矩阵', async () => {
      const mockPosts = [
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-15T09:00:00+08:00') }, // 周一 9点
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-15T14:00:00+08:00') }, // 周一 14点
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-16T09:00:00+08:00') }, // 周二 9点
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

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
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-15T09:00:00+08:00') }, // 3条
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-15T09:30:00+08:00') },
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-15T09:45:00+08:00') },
        { id: '4', event_id: 'event-123', created_at: new Date('2024-01-15T14:00:00+08:00') }, // 1条
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

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
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-15T09:00:00+08:00') },
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-15T09:30:00+08:00') },
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-15T14:00:00+08:00') },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.peakTime.hour).toBe(9);
      expect(result.peakTime.weekday).toBe(1); // 周一
      expect(result.peakTime.count).toBe(2);
      expect(result.peakTime.label).toBe('周一 09:00');
    });

    it('应该正确识别低谷时间', async () => {
      const mockPosts = [
        { id: '1', event_id: 'event-123', created_at: new Date('2024-01-15T09:00:00+08:00') }, // 2条
        { id: '2', event_id: 'event-123', created_at: new Date('2024-01-15T09:30:00+08:00') },
        { id: '3', event_id: 'event-123', created_at: new Date('2024-01-15T14:00:00+08:00') }, // 1条
        { id: '4', event_id: 'event-123', created_at: new Date('2024-01-15T18:00:00+08:00') }, // 1条
        { id: '5', event_id: 'event-123', created_at: new Date('2024-01-15T23:00:00+08:00') }, // 1条（更晚）
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

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

  describe('洞察生成', () => {
    it('应该生成工作时间发帖高峰洞察', async () => {
      // 周一到周五，9-18点发帖（每天10条，共50条）
      const mockPosts = [];
      const dates = [
        '2024-01-15', // 周一
        '2024-01-16', // 周二
        '2024-01-17', // 周三
        '2024-01-18', // 周四
        '2024-01-19', // 周五
      ];

      for (const dateStr of dates) {
        for (let hour = 9; hour <= 18; hour++) {
          // 使用 padStart 确保小时是两位数
          const hourStr = String(hour).padStart(2, '0');
          mockPosts.push({
            id: `post-${dateStr}-${hour}`,
            event_id: 'event-123',
            created_at: new Date(`${dateStr}T${hourStr}:00:00+08:00`),
          });
        }
      }

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.insights).toContain('发帖高峰集中在工作时间');
    });

    it('应该生成周末活跃度洞察', async () => {
      // 周日和周六发帖占比 > 40%
      const mockPosts = [];
      // 周日 40条
      for (let i = 0; i < 40; i++) {
        mockPosts.push({
          id: `sun-${i}`,
          event_id: 'event-123',
          created_at: new Date('2024-01-14T10:00:00+08:00'),
        });
      }
      // 周六 30条
      for (let i = 0; i < 30; i++) {
        mockPosts.push({
          id: `sat-${i}`,
          event_id: 'event-123',
          created_at: new Date('2024-01-20T10:00:00+08:00'),
        });
      }
      // 工作日 30条
      for (let i = 0; i < 30; i++) {
        mockPosts.push({
          id: `work-${i}`,
          event_id: 'event-123',
          created_at: new Date('2024-01-15T10:00:00+08:00'),
        });
      }

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts as any);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.insights).toContain('周末发帖活跃度较高');
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
