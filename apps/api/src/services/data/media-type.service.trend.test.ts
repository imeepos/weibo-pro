import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaTypeService } from './media-type.service';
import { CacheService } from '../cache.service';
import { mockEntityManager } from '../../test-setup';
import { setupMediaTypeServiceTest, createMockPost } from './media-type.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('MediaTypeService 趋势分析与缓存测试', () => {
  let service: MediaTypeService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupMediaTypeServiceTest();
    service = harness.service;
    cacheService = harness.cacheService;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

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
