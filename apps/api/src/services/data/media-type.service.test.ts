import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaTypeService } from './media-type.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { WeiboPostEntity } from '@sker/entities';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('MediaTypeService', () => {
  let service: MediaTypeService;
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
      innerJoin: vi.fn().mockReturnThis(),
      setParameter: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
      getMany: vi.fn().mockResolvedValue([]),
    };

    // Mock getRepository to return query builder
    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => mockQueryBuilder),
    } as any);

    // 创建 mock cache service
    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
      return fn();
    });

    service = new MediaTypeService(cacheService);
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('应该返回默认结构当事件没有帖子数据', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution).toEqual([]);
      expect(result.totalPosts).toBe(0);
      expect(result.trend).toEqual([]);
      expect(result.engagementByType).toEqual([]);
    });

    it('应该正确检测纯文本帖子', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.totalPosts).toBe(1);
      expect(result.distribution).toHaveLength(1);
      expect(result.distribution[0]?.type).toBe('text');
      expect(result.distribution[0]?.count).toBe(1);
      expect(result.distribution[0]?.percentage).toBe(100);
    });

    it('应该正确检测图片帖子', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: ['pic1', 'pic2'],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 3,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('image');
    });

    it('应该正确检测视频帖子', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: { type: 'video' },
          url_struct: [],
          attitudes_count: 30,
          comments_count: 15,
          reposts_count: 5,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('video');
    });

    it('应该正确检测链接帖子', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [{ url: 'https://example.com' }],
          attitudes_count: 15,
          comments_count: 8,
          reposts_count: 4,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('link');
    });

    it('应该正确检测混合帖子（图片+链接）', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: ['pic1'],
          page_info: null,
          url_struct: [{ url: 'https://example.com' }],
          attitudes_count: 25,
          comments_count: 12,
          reposts_count: 6,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('mixed');
    });

    it('视频应该优先于其他类型', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: ['pic1'],
          page_info: { type: 'video' },
          url_struct: [{ url: 'https://example.com' }],
          attitudes_count: 50,
          comments_count: 20,
          reposts_count: 10,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('video');
    });
  });

  describe('分布统计测试', () => {
    it('应该正确统计各类型分布', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '2',
          pic_ids: ['pic1'],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 3,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '3',
          pic_ids: ['pic2'],
          page_info: null,
          url_struct: [],
          attitudes_count: 25,
          comments_count: 12,
          reposts_count: 4,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.totalPosts).toBe(3);
      expect(result.distribution).toHaveLength(2);

      const textDist = result.distribution.find(d => d.type === 'text');
      const imageDist = result.distribution.find(d => d.type === 'image');

      expect(textDist?.count).toBe(1);
      expect(textDist?.percentage).toBeCloseTo(33.33, 1);
      expect(imageDist?.count).toBe(2);
      expect(imageDist?.percentage).toBeCloseTo(66.67, 1);
    });

    it('应该正确计算平均互动量', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '2',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 3,
          created_at: new Date('2024-01-01T11:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      const textDist = result.distribution.find(d => d.type === 'text');
      // avgEngagement = likes + comments + reposts
      // Post1: 10 + 5 + 2 = 17
      // Post2: 20 + 10 + 3 = 33
      // Average: (17 + 33) / 2 = 25
      expect(textDist?.avgEngagement).toBe(25);
    });
  });

  describe('互动量分析测试', () => {
    it('应该正确计算各类型的平均互动量', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '2',
          pic_ids: ['pic1'],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 5,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.engagementByType).toHaveLength(2);

      const textEngagement = result.engagementByType.find(e => e.type === 'text');
      const imageEngagement = result.engagementByType.find(e => e.type === 'image');

      expect(textEngagement?.avgLikes).toBe(10);
      expect(textEngagement?.avgComments).toBe(5);
      expect(textEngagement?.avgReposts).toBe(2);

      expect(imageEngagement?.avgLikes).toBe(20);
      expect(imageEngagement?.avgComments).toBe(10);
      expect(imageEngagement?.avgReposts).toBe(5);
    });
  });

  describe('趋势分析测试', () => {
    it('应该正确生成时间趋势数据', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '2',
          pic_ids: ['pic1'],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 3,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockPost({
          id: '3',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 15,
          comments_count: 8,
          reposts_count: 4,
          created_at: new Date('2024-01-01T11:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.trend).toHaveLength(2); // 2个小时
      expect(result.trend[0]?.types.text).toBe(1);
      expect(result.trend[0]?.types.image).toBe(1);
      expect(result.trend[1]?.types.text).toBe(1);
    });
  });

  describe('缓存行为测试', () => {
    it('应该使用缓存', async () => {
      const cachedData = {
        distribution: [{ type: 'text' as const, count: 10, percentage: 100, avgEngagement: 20 }],
        totalPosts: 10,
        trend: [],
        engagementByType: [],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'media-type:distribution:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });

  describe('边界条件测试', () => {
    it('应该正确处理空 pic_ids', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('text');
    });

    it('应该正确处理 null page_info', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: ['pic1'],
          page_info: null,
          url_struct: [],
          attitudes_count: 20,
          comments_count: 10,
          reposts_count: 3,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('image');
    });

    it('应该正确处理空 url_struct', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 10,
          comments_count: 5,
          reposts_count: 2,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.type).toBe('text');
    });

    it('应该正确处理零互动数据', async () => {
      const mockPosts = [
        createMockPost({
          id: '1',
          pic_ids: [],
          page_info: null,
          url_struct: [],
          attitudes_count: 0,
          comments_count: 0,
          reposts_count: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getMediaTypeDistribution('event-123');

      expect(result.distribution[0]?.avgEngagement).toBe(0);
      expect(result.engagementByType[0]?.avgLikes).toBe(0);
      expect(result.engagementByType[0]?.avgComments).toBe(0);
      expect(result.engagementByType[0]?.avgReposts).toBe(0);
    });
  });
});

// Helper function to create mock WeiboPostEntity
function createMockPost(overrides: any): WeiboPostEntity {
  const base: any = {
    id: '1',
    event_id: 'event-123',
    pic_ids: [],
    page_info: null,
    url_struct: [],
    attitudes_count: 0,
    comments_count: 0,
    reposts_count: 0,
    created_at: new Date(),
  };
  return { ...base, ...overrides } as WeiboPostEntity;
}
