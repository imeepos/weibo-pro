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

describe('MediaTypeService 基础功能测试', () => {
  let service: MediaTypeService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupMediaTypeServiceTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

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
