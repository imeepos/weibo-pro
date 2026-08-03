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

  describe('统计分析测试', () => {
    it('8. 深度分布统计正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '评论1', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '3', floor_number: 2, text: '评论2', user_id: 103, reply_to_user_id: 100 }),
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
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '热门评论', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '1', floor_number: 0, text: '回复2', user_id: 103, reply_to_user_id: 101 }),
        createComment({ id: '4', rootid: '1', floor_number: 0, text: '回复3', user_id: 104, reply_to_user_id: 101 }),
        createComment({ id: '5', rootid: '5', floor_number: 2, text: '普通评论', user_id: 105, reply_to_user_id: 100 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.discussionHotspots).toHaveLength(1);
      expect(result.discussionHotspots[0]!.rootCommentId).toBe('1');
      expect(result.discussionHotspots[0]!.replyCount).toBe(3);
    });

    it('10. 参与者数量统计正确', async () => {
      const mockComments = [
        createComment({ id: '1', rootid: '1', floor_number: 1, text: '评论1', user_id: 101, reply_to_user_id: 100 }),
        createComment({ id: '2', rootid: '1', floor_number: 0, text: '回复1', user_id: 102, reply_to_user_id: 101 }),
        createComment({ id: '3', rootid: '1', floor_number: 0, text: '回复2', user_id: 103, reply_to_user_id: 101 }),
        createComment({ id: '4', rootid: '1', floor_number: 0, text: '回复3', user_id: 104, reply_to_user_id: 101 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockComments);

      const result = await service.getCommentDepth('event-123');

      expect(result.discussionHotspots[0]!.participants).toBe(4);
    });
  });
});
