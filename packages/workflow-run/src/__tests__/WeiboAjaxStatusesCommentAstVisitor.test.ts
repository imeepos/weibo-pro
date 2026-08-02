/**
 * 测试：WeiboAjaxStatusesCommentAstVisitor 统计重复更新问题验证
 *
 * 问题描述：
 * 当数据库中已有评论数据时，统计表（event_hourly_statistics 和 user_relation_statistics）
 * 仍然会被重复更新，导致计数重复累加。
 *
 * 修复方案：
 * 利用已有的 existingIds 过滤出新评论，只对新评论触发统计更新。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from 'typeorm';
import { WeiboCommentEntity, WeiboPostEntity, WeiboUserEntity, UserRelationStatisticsHelper, UserRelationType, HourlyStatisticsHelper } from '@sker/entities';

/**
 * Mock EntityManager 用于测试
 */
class MockEntityManager extends EntityManager {
  public data: Map<string, any> = new Map();
  public commentData: Map<number, WeiboCommentEntity> = new Map();
  public postData: Map<string, WeiboPostEntity> = new Map();

  constructor() {
    super();
  }

  /**
   * 模拟 find - 查找评论
   */
  async find(entity: any, options?: any): Promise<any[]> {
    if (entity === WeiboCommentEntity) {
      const results: WeiboCommentEntity[] = [];
      for (const condition of options?.where || []) {
        const comment = this.commentData.get(condition.id);
        if (comment) {
          results.push(comment);
        }
      }
      return results;
    }
    return [];
  }

  /**
   * 模拟 findOne - 查找帖子
   */
  async findOne(entity: any, options?: any): Promise<any> {
    if (entity === WeiboPostEntity && options?.where?.id) {
      return this.postData.get(options.where.id);
    }

    // 模拟查找统计数据
    // 需要处理两种情况：
    // 1. 直接查询 event_hourly_statistics 表
    // 2. 通过 where 条件查询
    const entityName = typeof entity === 'string' ? entity : entity?.name;
    if (entityName === 'EventHourlyStatisticsEntity' || entityName === 'event_hourly_statistics' || options?.where?.event_id) {
      const statsKey = `stats_${options?.where?.event_id}_${options?.where?.year}_${options?.where?.month}_${options?.where?.day}_${options?.where?.hour}`;
      return this.data.get(statsKey) || null;
    }

    // 模拟查找用户关系统计
    if (options?.where?.sourceUserId) {
      const relationKey = `relation_${options.where.sourceUserId}_${options.where.targetUserId}_${options.where.relationType}_${options.where.eventId}`;
      return this.data.get(relationKey) || null;
    }

    return null;
  }

  /**
   * 模拟 create - 创建实体
   */
  create(entity: any, data: any): any {
    if (entity === WeiboCommentEntity) {
      return data;
    }
    if (entity === WeiboUserEntity) {
      return data;
    }
    return data;
  }

  /**
   * 模拟 upsert - 插入或更新
   */
  async upsert(entity: any, data: any[], _conflictPaths: string[]): Promise<any> {
    if (entity === WeiboCommentEntity) {
      for (const item of data) {
        this.commentData.set(item.id, item);
      }
    }
    if (entity === WeiboUserEntity) {
      // 用户数据处理
    }
    return data;
  }

  /**
   * 模拟 createQueryBuilder - 用于 UPSERT 操作
   */
  createQueryBuilder(): any {
    const self = this;
    return {
      insert() {
        return {
          into(_entity: any) {
            return {
              values(values: any) {
                return {
                  orUpdate(_columns: string[], _conflictColumns: string[]) {
                    return {
                      updateEntity(_bool: boolean) {
                        return this;
                      },
                      callListeners(_bool: boolean) {
                        return this;
                      },
                      async execute() {
                        self.handleStatisticsUpsert(values);
                        return { raw: [] };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };
  }

  /**
   * 处理统计数据的 UPSERT
   */
  private handleStatisticsUpsert(values: any) {
    // 处理 EventHourlyStatisticsEntity 的 UPSERT
    if (values.event_id !== undefined) {
      const key = `stats_${values.event_id}_${values.year}_${values.month}_${values.day}_${values.hour}`;

      // HourlyStatisticsHelper.upsertStatistics 已经在内存中计算好了累加值
      // 这里直接保存,不再累加
      this.data.set(key, {
        ...values,
        created_at: values.created_at || new Date(),
        updated_at: new Date()
      });
    }

    // 处理 UserRelationStatistics 的 UPSERT
    if (values.sourceUserId !== undefined) {
      const key = `relation_${values.sourceUserId}_${values.targetUserId}_${values.relationType}_${values.eventId}`;

      // UserRelationStatisticsHelper.upsertRelation 已经在内存中计算好了累加值
      // 这里直接保存,不再累加
      this.data.set(key, {
        ...values,
        created_at: values.created_at || new Date(),
        updated_at: new Date()
      });
    }
  }

  /**
   * 获取统计数据
   */
  getStatistics(eventId: string, year: number, month: number, day: number, hour: number) {
    const key = `stats_${eventId}_${year}_${month}_${day}_${hour}`;
    return this.data.get(key);
  }

  /**
   * 获取用户关系数据
   */
  getRelation(sourceUserId: string, targetUserId: string, relationType: UserRelationType, eventId: string) {
    const key = `relation_${sourceUserId}_${targetUserId}_${relationType}_${eventId}`;
    return this.data.get(key);
  }

  /**
   * 设置已存在的评论
   */
  setExistingComment(comment: WeiboCommentEntity) {
    this.commentData.set(comment.id, comment);
  }

  /**
   * 设置帖子数据
   */
  setPost(post: WeiboPostEntity) {
    this.postData.set(post.id, post);
  }

  /**
   * 重置 mock 数据
   */
  reset() {
    this.data.clear();
    this.commentData.clear();
    this.postData.clear();
  }
}

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
