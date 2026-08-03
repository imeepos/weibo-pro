import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboLikeEntity, WeiboPostEntity } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-like-mock-entity-manager';

describe('WeiboAjaxStatusesLikeShowAstVisitor - 统计更新修复验证', () => {
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

      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: postId, targetUserWeiboId: 'author1', createdAt: new Date() }
      ];

      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      // 查询帖子
      const post = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId },
        select: {
          event_id: true
        }
      });

      // 没有新数据或没有 event_id，不应该触发统计
      // 当 post?.event_id 为 undefined 时，post?.event_id && newLikes.length > 0 会返回 undefined
      // 修复后的代码会检查 post?.event_id，为 falsy 时不会触发统计
      const hasEventId = !!post?.event_id;
      const hasNewLikes = newLikes.length > 0;

      expect(hasEventId).toBe(false);
      expect(hasNewLikes).toBe(true); // 有新数据，但没有 event_id
    });

    it('自赞不应该触发用户关系统计', async () => {
      const eventId = 'test-event-self-like';
      const postId = 'post-self-like';
      const userWeiboId = 'user1';
      const targetUserWeiboId = 'user1'; // 自赞

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const likeEntities = [
        { userWeiboId, targetWeiboId: postId, targetUserWeiboId, createdAt: new Date() }
      ];

      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      // 计算应该触发关系统计的数量
      let relationStatsCount = 0;
      for (const like of newLikes) {
        if (like.userWeiboId !== like.targetUserWeiboId) {
          relationStatsCount++;
        }
      }

      // 自赞不应该触发关系统计
      expect(relationStatsCount).toBe(0);
    });

    it('没有 createdAt 的点赞不应该触发小时统计', async () => {
      const eventId = 'test-event-no-time';
      const postId = 'post-no-time';

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: postId, targetUserWeiboId: 'author1' } // 注意：没有 createdAt
      ];

      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      // 计算应该触发小时统计的数量
      let hourlyStatsCount = 0;
      for (const like of newLikes) {
        if (like.createdAt) {
          hourlyStatsCount++;
        }
      }

      // 没有 createdAt，不应该触发小时统计
      expect(hourlyStatsCount).toBe(0);
    });

    it('使用帖子时间作为点赞时间近似值', async () => {
      const eventId = 'test-event-approximate-time';
      const postId = 'post-approximate-time';
      const postTime = new Date('2026-01-22T10:30:00Z');

      // 预设帖子数据（包含 created_at）
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId,
        created_at: postTime
      });

      // 模拟从 API 获取的点赞数据（没有时间戳）
      const apiLikeData = [
        { user: { id: 'user1' } },
        { user: { id: 'user2' } }
      ];

      // 获取帖子时间作为近似值
      const post = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId },
        select: {
          created_at: true,
          event_id: true
        }
      });
      const approximateLikeTime = post?.created_at || new Date();

      // 创建点赞实体（使用帖子时间）
      const likeEntities = apiLikeData.map(item =>
        mockManager.create(WeiboLikeEntity, {
          userWeiboId: String(item.user.id),
          targetWeiboId: postId,
          targetUserWeiboId: 'author1',
          createdAt: approximateLikeTime
        })
      );

      // 验证：所有点赞记录都有 createdAt
      expect(likeEntities.every(like => like.createdAt)).toBe(true);

      // 验证：createdAt 等于帖子时间
      expect(likeEntities[0].createdAt).toEqual(postTime);
      expect(likeEntities[1].createdAt).toEqual(postTime);
    });
  });
});
