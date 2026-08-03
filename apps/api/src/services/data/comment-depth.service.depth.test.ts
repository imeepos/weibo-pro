import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentDepthService } from './comment-depth.service';
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
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupCommentDepthTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('深度计算测试', () => {
    it('4. 多层级评论深度计算正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '一级评论', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '1', floor_number: 0, text: '回复2', user_id: 103, reply_to_user_id: 102 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.totalRootComments).toBe(1);
      expect(result.totalReplies).toBe(2);
      expect(result.maxThreadDepth).toBe(2);
    });

    it('5. 平均深度计算正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '评论1', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '3', floor_number: 2, text: '评论2', user_id: 103, reply_to_user_id: 100 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 两个根评论，一个深度为1，一个深度为0，平均深度 = (1 + 0) / 2 = 0.5
      expect(result.avgThreadDepth).toBeCloseTo(0.5, 1);
    });

    it('6. 最大深度计算正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '一级评论', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '1', floor_number: 0, text: '回复2', user_id: 103, reply_to_user_id: 102 }),
        createComment({ id: '4', rootid: '1', floor_number: 0, text: '回复3', user_id: 104, reply_to_user_id: 103 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 1 -> 2 -> 3 -> 4，深度为3
      expect(result.maxThreadDepth).toBe(3);
    });

    it('7. 回复率计算正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '评论1', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '2', floor_number: 2, text: '评论2', user_id: 102, reply_to_user_id: 100 }),
        createComment({ id: '3', rootid: '3', floor_number: 3, text: '评论3', user_id: 103, reply_to_user_id: 100 }),
        createComment({ id: '4', rootid: '1', floor_number: 0, text: '回复1', user_id: 104, reply_to_user_id: 101 }),
        createComment({ id: '5', rootid: '1', floor_number: 0, text: '回复2', user_id: 105, reply_to_user_id: 101 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      // 3个一级评论，2个回复，回复率 = 2/5 = 0.4
      expect(result.replyRatio).toBeCloseTo(0.4, 1);
    });
  });
});
