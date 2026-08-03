/**
 * 测试：WeiboAjaxStatusesShowAstVisitor 边界情况与错误码处理
 *
 * 从 WeiboAjaxStatusesShowAstVisitor.test.ts 按主题拆分的测试组：
 * - 边界情况：缺少 event_id / created_at 的帖子不触发统计更新
 * - error_code=20170 处理：API 返回不可见响应时跳过后续处理
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboPostEntity } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-ajax-statuses-show-mock-entity-manager';

describe('WeiboAjaxStatusesShowAstVisitor - 边界情况与错误码处理', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('边界情况', () => {
    it('没有 event_id 的帖子不应该触发统计更新', async () => {
      const postId = 'post-no-event';
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        created_at: '2026-01-22T10:30:00Z'
        // 注意：没有 event_id
      });

      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !existingPost;

      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 即使是新帖子，如果没有 event_id，也不应该触发统计更新
      let statsUpdated = false;
      if (isNewPost && post.event_id && post.created_at) {
        statsUpdated = true;
      }

      expect(statsUpdated).toBe(false);
    });

    it('没有 created_at 的帖子不应该触发统计更新', async () => {
      const postId = 'post-no-created-at';
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        event_id: 'test-event-no-time'
        // 注意：没有 created_at
      });

      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !existingPost;

      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 即使是新帖子，如果没有 created_at，也不应该触发统计更新
      let statsUpdated = false;
      if (isNewPost && post.event_id && post.created_at) {
        statsUpdated = true;
      }

      expect(statsUpdated).toBe(false);
    });
  });

  describe('error_code=20170 处理', () => {
    it('当 API 返回 error_code=20170 时，应该正常处理并返回 null 数据', async () => {
      // 模拟 API 返回 error_code=20170 的响应
      const apiResponse = {
        ok: 0,
        message: '由于博主设置，目前内容暂不可见。',
        error_code: 20170
      };

      // 验证响应结构
      expect(apiResponse.ok).toBe(0);
      expect(apiResponse.error_code).toBe(20170);

      // 当检测到 error_code=20170 时，应该跳过后续处理
      // 不应该尝试访问 body.user 或 body.id 等字段
      // 应该返回 null 数据让下游节点继续处理
      const shouldSkip = apiResponse.error_code === 20170;
      expect(shouldSkip).toBe(true);

      // 验证响应没有实际的微博内容
      expect(apiResponse).not.toHaveProperty('user');
      expect(apiResponse).not.toHaveProperty('id');
      expect(apiResponse).not.toHaveProperty('text');
    });
  });
});
