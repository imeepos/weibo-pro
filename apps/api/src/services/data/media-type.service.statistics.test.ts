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

describe('MediaTypeService 分布统计测试', () => {
  let service: MediaTypeService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupMediaTypeServiceTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

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
});
