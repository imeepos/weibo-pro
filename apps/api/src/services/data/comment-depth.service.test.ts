import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentDepthService } from './comment-depth.service';
import { CacheService } from '../cache.service';
import { mockEntityManager } from '../../test-setup';
import {
  setupCommentDepthTest,
  createComment,
} from './comment-depth.service.test-helpers';

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
    const harness = setupCommentDepthTest();
    service = harness.service;
    cacheService = harness.cacheService;
    mockQueryBuilder = harness.mockQueryBuilder;
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
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '一级评论', user_id: 101, reply_to_user_id: 100 }),
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
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '一级评论', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复评论', user_id: 102, reply_to_user_id: 101 }),
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

  describe('边界条件和缓存', () => {
    it('11. 边界条件（最大深度限制）', async () => {
      // 创建一个非常深的回复链
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '根评论', user_id: 101, reply_to_user_id: 100 }),
      ];

      // 添加100层回复
      for (let i = 2; i <= 100; i++) {
        mockComments.push(createComment({
          id: String(i),
          rootid: '1',
          floor_number: 0,
          text: `回复${i}`,
          user_id: 100 + i,
          reply_to_user_id: 100 + i - 1,
        }));
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
