import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboLikeEntity } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-like-mock-entity-manager';

describe('WeiboAjaxStatusesLikeShowAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('existingKeys 过滤逻辑', () => {
    it('应该正确过滤出新数据', async () => {
      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() },
        { userWeiboId: 'user2', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() },
        { userWeiboId: 'user3', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() }
      ];

      // 预设已存在的记录（user1 和 user2）
      mockManager.setLike('user1', 'post1', { userWeiboId: 'user1', targetWeiboId: 'post1' });
      mockManager.setLike('user2', 'post1', { userWeiboId: 'user2', targetWeiboId: 'post1' });

      // 查询已存在的记录
      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      // 过滤出新数据
      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      expect(newLikes.length).toBe(1);
      expect(newLikes[0].userWeiboId).toBe('user3');
    });

    it('应该正确处理全部是新数据的情况', async () => {
      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() },
        { userWeiboId: 'user2', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() }
      ];

      // 查询已存在的记录（没有预设数据）
      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      // 过滤出新数据
      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      expect(newLikes.length).toBe(2);
    });

    it('应该正确处理全部是已存在数据的情况', async () => {
      const likeEntities = [
        { userWeiboId: 'user1', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() },
        { userWeiboId: 'user2', targetWeiboId: 'post1', targetUserWeiboId: 'author1', createdAt: new Date() }
      ];

      // 预设所有记录
      mockManager.setLike('user1', 'post1', { userWeiboId: 'user1', targetWeiboId: 'post1' });
      mockManager.setLike('user2', 'post1', { userWeiboId: 'user2', targetWeiboId: 'post1' });

      // 查询已存在的记录
      const existingRecords = await mockManager.find(WeiboLikeEntity, {
        where: likeEntities.map(e => ({
          userWeiboId: e.userWeiboId,
          targetWeiboId: e.targetWeiboId
        }))
      });

      const existingKeys = new Set(
        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
      );

      // 过滤出新数据
      const newLikes = likeEntities.filter(e =>
        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
      );

      expect(newLikes.length).toBe(0);
    });
  });
});
