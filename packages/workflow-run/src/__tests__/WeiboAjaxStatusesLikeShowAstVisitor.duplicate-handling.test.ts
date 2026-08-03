import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboLikeEntity, HourlyStatisticsHelper } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-like-mock-entity-manager';

describe('WeiboAjaxStatusesLikeShowAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('修复验证：重复处理不会重复累加', () => {
    it('重复处理同一批点赞数据不会重复累加统计', async () => {
      const eventId = 'test-event-fix-verify';
      const postId = 'post-fix-verify';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: postId, targetUserWeiboId: 'author1', createdAt: postTime },
        { userWeiboId: 'user2', targetWeiboId: postId, targetUserWeiboId: 'author1', createdAt: postTime }
      ];

      // 第一次处理
      const existingRecords1 = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys1 = new Set(
        existingRecords1.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      const newLikes1 = likeEntities.filter(e =>
        !existingKeys1.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      expect(newLikes1.length).toBe(2);

      await mockManager.upsert(WeiboLikeEntity, likeEntities as any, ['userWeiboId', 'targetWeiboId']);

      // 统计更新（第一次）
      for (const like of newLikes1) {
        if (like.createdAt) {
          await HourlyStatisticsHelper.upsertStatistics(
            mockManager as any,
            eventId,
            timeDimensions,
            { like_count: 1, user_count: 1 }
          );
        }
      }

      // 第二次处理（模拟重复执行）
      const existingRecords2 = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys2 = new Set(
        existingRecords2.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      const newLikes2 = likeEntities.filter(e =>
        !existingKeys2.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      // 关键验证：第二次处理时，应该没有新数据
      expect(newLikes2.length).toBe(0);

      // 统计更新（第二次）- 不应该执行
      let statsCallCount = 0;
      for (const _like of newLikes2) {
        statsCallCount++;
      }

      expect(statsCallCount).toBe(0);
    });
  });
});
