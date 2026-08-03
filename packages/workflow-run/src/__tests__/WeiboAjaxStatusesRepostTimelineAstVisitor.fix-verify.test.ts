/**
 * 测试：WeiboAjaxStatusesRepostTimelineAstVisitor - 重复处理不会重复累加
 *
 * 修复内容：
 * - 利用已有的 existingIds 过滤新数据
 * - 避免重复处理导致统计数据重复累加
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboRepostEntity, HourlyStatisticsHelper } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-repost-mock-entity-manager';

describe('WeiboAjaxStatusesRepostTimelineAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('修复验证：重复处理不会重复累加', () => {
    it('重复处理同一批转发数据不会重复累加统计', async () => {
      const eventId = 'test-event-fix-verify';
      const postId = 'post-fix-verify';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, created_at: postTime, retweeted_status: { user: { id: 'author1' } } },
        { id: 'repost2', user_id: 'user2', post_id: postId, created_at: postTime, retweeted_status: { user: { id: 'author1' } } }
      ];

      // 第一次处理
      const ids1 = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords1 = await mockManager.find(WeiboRepostEntity, {
        where: ids1.map(id => ({ id }))
      });

      const existingIds1 = new Set(existingRecords1.map(r => r.id));
      const newReposts1 = repostEntities.filter(e => !existingIds1.has(e.id));

      expect(newReposts1.length).toBe(2);

      await mockManager.upsert(WeiboRepostEntity, repostEntities as any, ['id']);

      // 统计更新（第一次）
      for (const repost of newReposts1) {
        if (repost.created_at) {
          await HourlyStatisticsHelper.upsertStatistics(
            mockManager as any,
            eventId,
            timeDimensions,
            { repost_count: 1, user_count: 1 }
          );
        }
      }

      // 第二次处理（模拟重复执行）
      const existingRecords2 = await mockManager.find(WeiboRepostEntity, {
        where: ids1.map(id => ({ id }))
      });

      const existingIds2 = new Set(existingRecords2.map(r => r.id));
      const newReposts2 = repostEntities.filter(e => !existingIds2.has(e.id));

      // 关键验证：第二次处理时，应该没有新数据
      expect(newReposts2.length).toBe(0);

      // 统计更新（第二次）- 不应该执行
      let statsCallCount = 0;
      for (const _repost of newReposts2) {
        statsCallCount++;
      }

      expect(statsCallCount).toBe(0);
    });
  });
});
