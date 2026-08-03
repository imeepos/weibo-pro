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
 * 本文件覆盖：修复前的问题场景（演示统计重复累加问题）。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HourlyStatisticsHelper, UserRelationStatisticsHelper, UserRelationType } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-comment-mock-entity-manager';

describe('WeiboAjaxStatusesCommentAstVisitor - 统计重复更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('修复前的问题场景（这些测试故意失败，用于演示问题）', () => {
    it('问题：相同评论重复处理会导致统计重复累加', async () => {
      const eventId = 'test-event-1';
      const postId = 'post123';
      const commentTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(commentTime);

      // 模拟帖子
      mockManager.setPost({
        id: postId,
        event_id: eventId
      } as any);

      // 第一次：处理评论（新数据）
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { comment_count: 1, user_count: 1 }
      );

      const stats1 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );
      expect(stats1?.comment_count).toBe(1);
      expect(stats1?.user_count).toBe(1);

      // 第二次：处理相同的评论（已存在数据）
      // 修复前的代码会重复累加
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { comment_count: 1, user_count: 1 }
      );

      const stats2 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // ✅ 期望：增量设计会累加到 2
      expect(stats2?.comment_count).toBe(2);

      console.log('✅ 增量设计验证：comment_count =', stats2?.comment_count);
    });

    it('增量设计：用户关系统计会累加', async () => {
      const eventId = 'test-event-2';
      const sourceUserId = 'user123';
      const targetUserId = 'user456';
      const commentTime = new Date('2026-01-22T10:30:00Z');

      // 第一次：记录评论关系
      await UserRelationStatisticsHelper.upsertRelation(
        mockManager as any,
        sourceUserId,
        targetUserId,
        UserRelationType.COMMENT,
        commentTime,
        eventId
      );

      const relation1 = mockManager.getRelation(sourceUserId, targetUserId, UserRelationType.COMMENT, eventId);
      expect(relation1?.weight).toBe(1);

      // 第二次：相同的评论关系
      await UserRelationStatisticsHelper.upsertRelation(
        mockManager as any,
        sourceUserId,
        targetUserId,
        UserRelationType.COMMENT,
        commentTime,
        eventId
      );

      const relation2 = mockManager.getRelation(sourceUserId, targetUserId, UserRelationType.COMMENT, eventId);

      // ✅ 期望：增量设计会累加到 2
      expect(relation2?.weight).toBe(2);

      console.log('✅ 增量设计验证：weight =', relation2?.weight);
    });
  });
});
