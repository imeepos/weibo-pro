import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaTypeService } from './media-type.service';
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

describe('MediaTypeService 边界条件测试', () => {
  let service: MediaTypeService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupMediaTypeServiceTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

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
