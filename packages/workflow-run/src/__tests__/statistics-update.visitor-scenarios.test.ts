/**
 * 测试：统计表重复更新问题验证
 *
 * 本文件覆盖：综合场景，模拟各 Visitor 的处理流程，验证统计的增量累加行为。
 *
 * 测试策略：
 * 1. 使用 mock EntityManager 模拟数据库场景
 * 2. 第一次调用：模拟新数据插入，验证统计表正确累加
 * 3. 第二次调用：模拟相同数据再次处理，验证增量设计累加行为
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HourlyStatisticsHelper } from '@sker/entities';
import { MockEntityManager } from '../test/helpers/mock-entity-manager';

describe('统计表重复更新问题测试 - 综合场景', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('综合场景：模拟 Visitor 处理流程', () => {
    it('应该复现 WeiboAjaxStatusesShowAstVisitor 的帖子统计问题', async () => {
      const eventId = 'test-event-8';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 模拟第一次处理帖子（新数据）
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { post_count: 1, user_count: 1 }
      );

      const stats1 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );
      expect(stats1?.post_count).toBe(1);

      // 模拟第二次处理同一条帖子（数据已存在）
      // 在实际 Visitor 中，虽然会检查 newCount，但统计更新仍会触发
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { post_count: 1, user_count: 1 }
      );

      const stats2 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // ✅ 期望：增量设计会累加到 2
      expect(stats2?.post_count).toBe(2);

      console.log('✅ WeiboAjaxStatusesShowAstVisitor 验证：post_count =', stats2?.post_count);
    });

    it('应该正确处理 WeiboAjaxStatusesLikeShowAstVisitor 的点赞统计', async () => {
      const eventId = 'test-event-9';
      const likeTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(likeTime);

      // 模拟第一次处理点赞
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { like_count: 1, user_count: 1 }
      );

      const stats1 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );
      expect(stats1?.like_count).toBe(1);

      // 模拟第二次处理相同的点赞（数据已存在）
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { like_count: 1, user_count: 1 }
      );

      const stats2 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // ✅ 期望：增量设计会累加到 2
      expect(stats2?.like_count).toBe(2);

      console.log('✅ WeiboAjaxStatusesLikeShowAstVisitor 验证：like_count =', stats2?.like_count);
    });

    it('应该正确处理 WeiboAjaxStatusesCommentAstVisitor 的评论统计', async () => {
      const eventId = 'test-event-10';
      const commentTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(commentTime);

      // 模拟第一次处理评论
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

      // 模拟第二次处理相同的评论
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

      console.log('✅ WeiboAjaxStatusesCommentAstVisitor 验证：comment_count =', stats2?.comment_count);
    });

    it('应该正确处理 WeiboAjaxStatusesRepostTimelineAstVisitor 的转发统计', async () => {
      const eventId = 'test-event-11';
      const repostTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(repostTime);

      // 模拟第一次处理转发
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { repost_count: 1, user_count: 1 }
      );

      const stats1 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );
      expect(stats1?.repost_count).toBe(1);

      // 模拟第二次处理相同的转发
      await HourlyStatisticsHelper.upsertStatistics(
        mockManager as any,
        eventId,
        timeDimensions,
        { repost_count: 1, user_count: 1 }
      );

      const stats2 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // ✅ 期望：增量设计会累加到 2
      expect(stats2?.repost_count).toBe(2);

      console.log('✅ WeiboAjaxStatusesRepostTimelineAstVisitor 验证：repost_count =', stats2?.repost_count);
    });
  });
});
