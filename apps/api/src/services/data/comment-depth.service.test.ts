import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentDepthService } from './comment-depth.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { WeiboCommentEntity } from '@sker/entities';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('CommentDepthService', () => {
  let service: CommentDepthService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // 创建 mock query builder
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      setParameter: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
      getMany: vi.fn().mockResolvedValue([]),
    };

    // Mock createQueryBuilder 直接在 manager 上
    vi.spyOn(mockEntityManager, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

    // 创建 mock cache service
    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
      return fn();
    });

    service = new CommentDepthService(cacheService);
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('1. 空评论数据返回默认结构', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.getCommentDepth('event-123');

      expect(result.avgThreadDepth).toBe(0);
      expect(result.maxThreadDepth).toBe(0);
      expect(result.replyRatio).toBe(0);
      expect(result.totalRootComments).toBe(0);
      expect(result.totalReplies).toBe(0);
      expect(result.depthDistribution).toHaveLength(0);
      expect(result.discussionHotspots).toHaveLength(0);
    });

    it('2. 单个一级评论处理正确', async () => {
      const mockComments = [
        {
          id: '1',
          rootid: '1',
          floor_number: 1,
          text: '一级评论',
          post_id: 'post1',
          user_id: 101,
          reply_to_user_id: 100,
          created_at: '2024-01-01',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.totalRootComments).toBe(1);
      expect(result.totalReplies).toBe(0);
      expect(result.avgThreadDepth).toBe(0);
      expect(result.maxThreadDepth).toBe(0);
      expect(result.replyRatio).toBe(0);
    });

    it('3. 单个子评论处理正确', async () => {
      const mockComments = [
        {
          id: '1',
          rootid: '1',
          floor_number: 1,
          text: '一级评论',
          post_id: 'post1',
          user_id: 101,
          reply_to_user_id: 100,
          created_at: '2024-01-01',
        },
        {
          id: '2',
          rootid: '1',
          floor_number: 0,
          text: '回复评论',
          post_id: 'post1',
          user_id: 102,
          reply_to_user_id: 101,
          created_at: '2024-01-01',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.totalRootComments).toBe(1);
      expect(result.totalReplies).toBe(1);
      expect(result.avgThreadDepth).toBe(1);
      expect(result.maxThreadDepth).toBe(1);
      expect(result.replyRatio).toBeCloseTo(0.5, 1);
    });
  });

  describe('深度计算测试', () => {
    it('4. 多层级评论深度计算正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '一级评论', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '1', floor_number: 0, text: '回复2', post_id: 'post1', user_id: 103, reply_to_user_id: 102, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.totalRootComments).toBe(1);
      expect(result.totalReplies).toBe(2);
      expect(result.maxThreadDepth).toBe(2);
    });

    it('5. 平均深度计算正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '评论1', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '3', floor_number: 2, text: '评论2', post_id: 'post1', user_id: 103, reply_to_user_id: 100, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 两个根评论，一个深度为1，一个深度为0，平均深度 = (1 + 0) / 2 = 0.5
      expect(result.avgThreadDepth).toBeCloseTo(0.5, 1);
    });

    it('6. 最大深度计算正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '一级评论', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '1', floor_number: 0, text: '回复2', post_id: 'post1', user_id: 103, reply_to_user_id: 102, created_at: '2024-01-01' },
        { id: '4', rootid: '1', floor_number: 0, text: '回复3', post_id: 'post1', user_id: 104, reply_to_user_id: 103, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 1 -> 2 -> 3 -> 4，深度为3
      expect(result.maxThreadDepth).toBe(3);
    });

    it('7. 回复率计算正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '评论1', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '2', floor_number: 2, text: '评论2', post_id: 'post1', user_id: 102, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '3', rootid: '3', floor_number: 3, text: '评论3', post_id: 'post1', user_id: 103, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '4', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 104, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '5', rootid: '1', floor_number: 0, text: '回复2', post_id: 'post1', user_id: 105, reply_to_user_id: 101, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 3个一级评论，2个回复，回复率 = 2/5 = 0.4
      expect(result.replyRatio).toBeCloseTo(0.4, 1);
    });
  });

  describe('统计分析测试', () => {
    it('8. 深度分布统计正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '评论1', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '3', floor_number: 2, text: '评论2', post_id: 'post1', user_id: 103, reply_to_user_id: 100, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.depthDistribution).toHaveLength(2);
      const depth0 = result.depthDistribution.find(d => d.depth === 0);
      const depth1 = result.depthDistribution.find(d => d.depth === 1);
      expect(depth0?.count).toBe(1);
      expect(depth1?.count).toBe(1);
    });

    it('9. 热门讨论识别正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '热门评论', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '1', floor_number: 0, text: '回复2', post_id: 'post1', user_id: 103, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '4', rootid: '1', floor_number: 0, text: '回复3', post_id: 'post1', user_id: 104, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '5', rootid: '5', floor_number: 2, text: '普通评论', post_id: 'post1', user_id: 105, reply_to_user_id: 100, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.discussionHotspots).toHaveLength(1);
      expect(result.discussionHotspots[0].rootCommentId).toBe('1');
      expect(result.discussionHotspots[0].replyCount).toBe(3);
    });

    it('10. 参与者数量统计正确', async () => {
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '评论1', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
        { id: '2', rootid: '1', floor_number: 0, text: '回复1', post_id: 'post1', user_id: 102, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '3', rootid: '1', floor_number: 0, text: '回复2', post_id: 'post1', user_id: 103, reply_to_user_id: 101, created_at: '2024-01-01' },
        { id: '4', rootid: '1', floor_number: 0, text: '回复3', post_id: 'post1', user_id: 104, reply_to_user_id: 101, created_at: '2024-01-01' },
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.discussionHotspots[0].participants).toBe(4);
    });
  });

  describe('边界条件和缓存', () => {
    it('11. 边界条件（最大深度限制）', async () => {
      // 创建一个非常深的回复链
      const mockComments = [
        { id: '1', rootid: '1', floor_number: 1, text: '根评论', post_id: 'post1', user_id: 101, reply_to_user_id: 100, created_at: '2024-01-01' },
      ];

      // 添加100层回复
      for (let i = 2; i <= 100; i++) {
        mockComments.push({
          id: String(i),
          rootid: '1',
          floor_number: 0,
          text: `回复${i}`,
          post_id: 'post1',
          user_id: 100 + i,
          reply_to_user_id: 100 + i - 1,
          created_at: '2024-01-01',
        });
      }

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 应该正确计算深度（可能有限制，但不应该崩溃）
      expect(result.maxThreadDepth).toBeGreaterThan(0);
      expect(result.totalReplies).toBe(99);
    });

    it('12. 缓存功能正常', async () => {
      const cachedData = {
        avgThreadDepth: 2.5,
        maxThreadDepth: 5,
        replyRatio: 0.6,
        totalRootComments: 10,
        totalReplies: 15,
        depthDistribution: [
          { depth: 0, count: 3, percentage: 30 },
          { depth: 1, count: 4, percentage: 40 },
          { depth: 2, count: 2, percentage: 20 },
          { depth: 3, count: 1, percentage: 10 },
        ],
        discussionHotspots: [
          {
            rootCommentId: '1',
            rootCommentText: '热门讨论',
            replyCount: 8,
            maxDepth: 4,
            participants: 6,
          },
        ],
      };

      vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

      const result = await service.getCommentDepth('event-123');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'comment:depth:event-123',
        expect.any(Function),
        1800
      );
      expect(result).toEqual(cachedData);
    });
  });
});
