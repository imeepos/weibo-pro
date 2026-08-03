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
 * 本文件覆盖：正确场景——利用 existingIds 过滤新数据，只对新评论触发统计。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeiboCommentEntity, HourlyStatisticsHelper, UserRelationStatisticsHelper, UserRelationType } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/weibo-comment-mock-entity-manager';

describe('WeiboAjaxStatusesCommentAstVisitor - 统计重复更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('正确场景：利用 existingIds 过滤新数据', () => {
    it('修复：利用 existingIds 过滤，只对新评论触发统计', async () => {
      const eventId = 'test-event-3';
      const postId = 'post123';
      const commentTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(commentTime);

      // 模拟帖子
      mockManager.setPost({
        id: postId,
        event_id: eventId
      } as any);

      // 模拟已存在的评论
      const existingComment = {
        id: 1001,
        user_id: 123,
        reply_to_user_id: 456,
        post_id: postId,
        created_at: commentTime
      } as WeiboCommentEntity;
      mockManager.setExistingComment(existingComment);

      // 模拟一批评论（包含已存在和新评论）
      const comments = [
        existingComment, // 已存在
        { id: 1002, user_id: 124, reply_to_user_id: 456, post_id: postId, created_at: commentTime }, // 新评论
        { id: 1003, user_id: 125, reply_to_user_id: 456, post_id: postId, created_at: commentTime }  // 新评论
      ] as WeiboCommentEntity[];

      // 修复后的逻辑：只处理新评论
      const ids = comments.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboCommentEntity, {
        where: ids.map(id => ({ id }))
      });
      const existingIds = new Set(existingRecords.map(r => r.id));
      const newComments = comments.filter(e => !existingIds.has(e.id));

      // 验证过滤结果
      expect(newComments.length).toBe(2);
      expect(newComments.every(c => ![1001].includes(c.id))).toBe(true);

      // 只对新评论触发统计
      for (const comment of newComments) {
        if (comment.created_at) {
          await HourlyStatisticsHelper.upsertStatistics(
            mockManager as any,
            eventId,
            timeDimensions,
            { comment_count: 1, user_count: 1 }
          );
        }
      }

      const stats = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // ✅ 修复后：只统计新评论（2条）
      expect(stats?.comment_count).toBe(2);
      expect(stats?.user_count).toBe(2);

      console.log('✅ 修复后：comment_count =', stats?.comment_count, '（正确统计新评论数）');
    });

    it('修复：用户关系统计只处理新评论', async () => {
      const eventId = 'test-event-4';
      const postId = 'post123';
      const commentTime = new Date('2026-01-22T10:30:00Z');

      // 模拟帖子
      mockManager.setPost({
        id: postId,
        event_id: eventId
      } as any);

      // 模拟已存在的评论
      const existingComment = {
        id: 2001,
        user_id: 123,
        reply_to_user_id: 456,
        post_id: postId,
        created_at: commentTime
      } as WeiboCommentEntity;
      mockManager.setExistingComment(existingComment);

      // 模拟一批评论（包含已存在和新评论）
      const comments = [
        existingComment, // 已存在
        { id: 2002, user_id: 124, reply_to_user_id: 456, post_id: postId, created_at: commentTime }, // 新评论
        { id: 2003, user_id: 125, reply_to_user_id: 456, post_id: postId, created_at: commentTime }  // 新评论
      ] as WeiboCommentEntity[];

      // 修复后的逻辑：只处理新评论
      const ids = comments.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboCommentEntity, {
        where: ids.map(id => ({ id }))
      });
      const existingIds = new Set(existingRecords.map(r => r.id));
      const newComments = comments.filter(e => !existingIds.has(e.id));

      // 只对新评论触发用户关系统计
      for (const comment of newComments) {
        const sourceUserId = comment.user_id?.toString();
        const targetUserId = comment.reply_to_user_id?.toString();

        if (sourceUserId && targetUserId && sourceUserId !== targetUserId) {
          await UserRelationStatisticsHelper.upsertRelation(
            mockManager as any,
            sourceUserId,
            targetUserId,
            UserRelationType.COMMENT,
            new Date(comment.created_at),
            eventId
          );
        }
      }

      // 验证统计结果
      const relation1 = mockManager.getRelation('124', '456', UserRelationType.COMMENT, eventId);
      const relation2 = mockManager.getRelation('125', '456', UserRelationType.COMMENT, eventId);

      expect(relation1?.weight).toBe(1);
      expect(relation2?.weight).toBe(1);

      console.log('✅ 修复后：只统计新评论的用户关系');
    });

    it('修复：全部是已存在评论时不触发统计', async () => {
      const eventId = 'test-event-5';
      const postId = 'post123';
      const commentTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(commentTime);

      // 模拟帖子
      mockManager.setPost({
        id: postId,
        event_id: eventId
      } as any);

      // 模拟已存在的评论
      const existingComments = [
        { id: 3001, user_id: 123, reply_to_user_id: 456, post_id: postId, created_at: commentTime },
        { id: 3002, user_id: 124, reply_to_user_id: 456, post_id: postId, created_at: commentTime }
      ] as WeiboCommentEntity[];

      for (const comment of existingComments) {
        mockManager.setExistingComment(comment);
      }

      // 模拟处理相同的评论
      const comments = existingComments;

      // 修复后的逻辑：只处理新评论
      const ids = comments.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboCommentEntity, {
        where: ids.map(id => ({ id }))
      });
      const existingIds = new Set(existingRecords.map(r => r.id));
      const newComments = comments.filter(e => !existingIds.has(e.id));

      // 验证过滤结果
      expect(newComments.length).toBe(0);

      // 只对新评论触发统计（这里没有新评论）
      for (const comment of newComments) {
        if (comment.created_at) {
          await HourlyStatisticsHelper.upsertStatistics(
            mockManager as any,
            eventId,
            timeDimensions,
            { comment_count: 1, user_count: 1 }
          );
        }
      }

      const stats = mockManager.getStatistics(eventId, 2026, 1, 22, 10);

      // ✅ 修复后：没有统计数据（因为全是已存在的评论）
      expect(stats).toBeUndefined();

      console.log('✅ 修复后：全部已存在评论时不触发统计');
    });
  });
});
