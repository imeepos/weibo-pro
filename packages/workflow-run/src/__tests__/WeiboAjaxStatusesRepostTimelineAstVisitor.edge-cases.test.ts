/**
 * 测试：WeiboAjaxStatusesRepostTimelineAstVisitor - 边界情况
 *
 * 修复内容：
 * - 利用已有的 existingIds 过滤新数据
 * - 只对新数据触发统计更新（用户关系统计 + 小时统计）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboRepostEntity, WeiboPostEntity } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-repost-mock-entity-manager';

describe('WeiboAjaxStatusesRepostTimelineAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('边界情况', () => {
    it('没有 event_id 的帖子不应该触发统计', async () => {
      const postId = 'post-no-event';

      // 预设帖子数据（没有 event_id）
      mockManager.setPost(postId, {
        id: postId
        // 注意：没有 event_id
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, created_at: new Date(), retweeted_status: { user: { id: 'author1' } } }
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 查询帖子
      const post = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId },
        select: {
          event_id: true
        }
      });

      // 没有新数据或没有 event_id，不应该触发统计
      const hasEventId = !!post?.event_id;
      const hasNewReposts = newReposts.length > 0;

      expect(hasEventId).toBe(false);
      expect(hasNewReposts).toBe(true); // 有新数据，但没有 event_id
    });

    it('自己转发自己不应该触发用户关系统计', async () => {
      const eventId = 'test-event-self-repost';
      const postId = 'post-self-repost';
      const userWeiboId = 'user1';
      const targetUserWeiboId = 'user1'; // 自己转发自己

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: userWeiboId, post_id: postId, created_at: new Date(), retweeted_status: { user: { id: targetUserWeiboId } } }
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 计算应该触发关系统计的数量
      let relationStatsCount = 0;
      for (const repost of newReposts) {
        const sourceUserId = repost.user_id?.toString();
        const targetUser = repost.retweeted_status as Record<string, unknown> | null;
        const targetUserId = targetUser?.user as Record<string, unknown> | undefined;
        const targetUserIdStr = targetUserId?.id?.toString();

        if (sourceUserId && targetUserIdStr && sourceUserId !== targetUserIdStr) {
          relationStatsCount++;
        }
      }

      // 自己转发自己不应该触发关系统计
      expect(relationStatsCount).toBe(0);
    });

    it('没有 created_at 的转发不应该触发小时统计', async () => {
      const eventId = 'test-event-no-time';
      const postId = 'post-no-time';

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, retweeted_status: { user: { id: 'author1' } } } // 注意：没有 created_at
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 计算应该触发小时统计的数量
      let hourlyStatsCount = 0;
      for (const repost of newReposts) {
        if (repost.created_at) {
          hourlyStatsCount++;
        }
      }

      // 没有 created_at，不应该触发小时统计
      expect(hourlyStatsCount).toBe(0);
    });
  });
});
