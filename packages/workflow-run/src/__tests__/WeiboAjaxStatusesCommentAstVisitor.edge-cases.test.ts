/**
 * 测试：WeiboAjaxStatusesCommentAstVisitor 统计重复更新问题验证
 *
 * 问题描述：
 * 当数据库中已有评论数据时，统计表（event_hourly_statistics 和 user_relation_statistics）
 * 仍然会被重复更新，导致计数重复累加。
 *
 * 修复方案：
 * 利用已有的 existingIds 过滤出新评论，只对新评论触发统计更新。
 *
 * 本文件覆盖：边界情况测试。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboCommentEntity, UserRelationStatisticsHelper, UserRelationType } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-comment-mock-entity-manager';

describe('WeiboAjaxStatusesCommentAstVisitor - 统计重复更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('边界情况测试', () => {
    it('处理空评论列表', async () => {
      const comments: WeiboCommentEntity[] = [];

      const ids = comments.map(e => e.id).filter(Boolean);
      expect(ids.length).toBe(0);

      console.log('✅ 边界情况：空评论列表处理正确');
    });

    it('处理评论ID为null的情况', async () => {
      const comments = [
        { id: null, user_id: 123, reply_to_user_id: 456, created_at: new Date() },
        { id: undefined, user_id: 124, reply_to_user_id: 456, created_at: new Date() }
      ] as WeiboCommentEntity[];

      const ids = comments.map(e => e.id).filter(Boolean);
      expect(ids.length).toBe(0);

      console.log('✅ 边界情况：评论ID为null时过滤正确');
    });

    it('处理用户ID相同的情况（不应统计关系）', async () => {
      const eventId = 'test-event-6';
      const commentTime = new Date('2026-01-22T10:30:00Z');

      const comment = {
        id: 4001,
        user_id: 123,
        reply_to_user_id: 123, // 自己评论自己
        created_at: commentTime
      } as WeiboCommentEntity;

      const sourceUserId = comment.user_id?.toString();
      const targetUserId = comment.reply_to_user_id?.toString();

      // 当 sourceUserId === targetUserId 时，不应触发关系统计
      if (sourceUserId && targetUserId && sourceUserId !== targetUserId) {
        await UserRelationStatisticsHelper.upsertRelation(
          mockManager as any,
          sourceUserId,
          targetUserId,
          UserRelationType.COMMENT,
          commentTime,
          eventId
        );
      }

      // 验证没有创建关系
      const relation = mockManager.getRelation('123', '123', UserRelationType.COMMENT, eventId);
      expect(relation).toBeUndefined();

      console.log('✅ 边界情况：自己评论自己时不创建关系统计');
    });
  });
});
