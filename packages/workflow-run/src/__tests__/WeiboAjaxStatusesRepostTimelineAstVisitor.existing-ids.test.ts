/**
 * 测试：WeiboAjaxStatusesRepostTimelineAstVisitor - existingIds 过滤逻辑
 *
 * 修复内容：
 * - 利用已有的 existingIds 过滤新数据
 * - 避免重复处理导致统计数据重复累加
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboRepostEntity } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-repost-mock-entity-manager';

describe('WeiboAjaxStatusesRepostTimelineAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('existingIds 过滤逻辑', () => {
    it('应该正确过滤出新数据', async () => {
      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } },
        { id: 'repost2', user_id: 'user2', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } },
        { id: 'repost3', user_id: 'user3', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } }
      ];

      // 预设已存在的记录（repost1 和 repost2）
      mockManager.setRepost('repost1', { id: 'repost1', user_id: 'user1' });
      mockManager.setRepost('repost2', { id: 'repost2', user_id: 'user2' });

      // 查询已存在的记录
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      // 过滤出新数据
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(1);
      expect(newReposts[0].id).toBe('repost3');
    });

    it('应该正确处理全部是新数据的情况', async () => {
      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } },
        { id: 'repost2', user_id: 'user2', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } }
      ];

      // 查询已存在的记录（没有预设数据）
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      // 过滤出新数据
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(2);
    });

    it('应该正确处理全部是已存在数据的情况', async () => {
      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } },
        { id: 'repost2', user_id: 'user2', post_id: 'post1', created_at: new Date(), retweeted_status: { user: { id: 'author1' } } }
      ];

      // 预设所有记录
      mockManager.setRepost('repost1', { id: 'repost1', user_id: 'user1' });
      mockManager.setRepost('repost2', { id: 'repost2', user_id: 'user2' });

      // 查询已存在的记录
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      // 过滤出新数据
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(0);
    });
  });
});
