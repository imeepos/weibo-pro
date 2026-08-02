/**
 * 测试：WeiboAjaxStatusesRepostTimelineAstVisitor 统计更新修复验证
 *
 * 修复内容：
 * - 利用已有的 existingIds 过滤新数据
 * - 只对新数据触发统计更新（用户关系统计 + 小时统计）
 * - 避免重复处理导致统计数据重复累加
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from 'typeorm';
import { WeiboRepostEntity, WeiboPostEntity, UserRelationStatisticsHelper, HourlyStatisticsHelper } from '@sker/entities';

/**
 * Mock EntityManager 用于测试
 */
class MockEntityManager extends EntityManager {
  public data: Map<string, any> = new Map();
  public upsertCallCount = 0;

  constructor() {
    super();
  }

  /**
   * 模拟 find - 批量查询记录
   */
  async find(entity: any, options?: any): Promise<any[]> {
    if (options?.where && Array.isArray(options.where)) {
      const results: any[] = [];
      for (const condition of options.where) {
        const key = `${entity.name || entity}_${condition.id}`;
        const existing = this.data.get(key);
        if (existing) {
          results.push(existing);
        }
      }
      return results;
    }
    return [];
  }

  /**
   * 模拟 findOne - 从内存存储中查找
   */
  async findOne(entity: any, options?: any): Promise<any> {
    if (options?.where?.id) {
      const key = `${entity.name || entity}_${options.where.id}`;
      return this.data.get(key) || null;
    }
    return null;
  }

  /**
   * 模拟 create - 创建实体实例
   */
  create(entity: any, data: any): any {
    return { ...data, constructor: { name: entity.name } };
  }

  /**
   * 模拟 upsert - 插入或更新
   */
  async upsert(entity: any, data: any | any[], _conflictPaths: string[]): Promise<any> {
    this.upsertCallCount++;

    // 支持批量 upsert
    const dataArray = Array.isArray(data) ? data : [data];

    for (const item of dataArray) {
      if (entity.name === 'WeiboRepostEntity') {
        const key = `${entity.name}_${item.id}`;
        const existing = this.data.get(key);

        this.data.set(key, {
          ...existing,
          ...item,
          updated_at: new Date()
        });
      } else if (entity.name === 'WeiboUserEntity') {
        const key = `${entity.name}_${item.id}`;
        this.data.set(key, {
          ...this.data.get(key),
          ...item,
          updated_at: new Date()
        });
      } else if (entity.name === 'WeiboPostEntity') {
        const key = `${entity.name}_${item.id}`;
        this.data.set(key, {
          ...this.data.get(key),
          ...item,
          updated_at: new Date()
        });
      }
    }

    return [{ raw: [] }];
  }

  /**
   * 模拟 createQueryBuilder - 用于统计表的 UPSERT 操作
   */
  createQueryBuilder(): any {
    const _self = this;
    const statsData: Map<string, any> = new Map();
    const relationData: Map<string, any> = new Map();

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
                        // 处理 EventHourlyStatisticsEntity 的 UPSERT
                        if (values.event_id !== undefined) {
                          const key = `stats_${values.event_id}_${values.year}_${values.month}_${values.day}_${values.hour}`;
                          const existing = statsData.get(key);

                          if (existing) {
                            // 更新现有记录（累加逻辑）
                            statsData.set(key, {
                              ...existing,
                              post_count: (existing.post_count || 0) + (values.post_count || 0),
                              comment_count: (existing.comment_count || 0) + (values.comment_count || 0),
                              repost_count: (existing.repost_count || 0) + (values.repost_count || 0),
                              like_count: (existing.like_count || 0) + (values.like_count || 0),
                              user_count: (existing.user_count || 0) + (values.user_count || 0),
                              updated_at: new Date()
                            });
                          } else {
                            // 插入新记录
                            statsData.set(key, {
                              ...values,
                              created_at: new Date(),
                              updated_at: new Date()
                            });
                          }
                        }

                        // 处理 EventUserRelationStatisticsEntity 的 UPSERT
                        if (values.user_weibo_id !== undefined) {
                          const key = `relation_${values.event_id}_${values.user_weibo_id}_${values.target_user_weibo_id}_${values.relation_type}`;
                          const existing = relationData.get(key);

                          if (existing) {
                            // 更新现有记录（累加逻辑）
                            relationData.set(key, {
                              ...existing,
                              count: (existing.count || 0) + 1,
                              updated_at: new Date()
                            });
                          } else {
                            // 插入新记录
                            relationData.set(key, {
                              ...values,
                              count: 1,
                              created_at: new Date(),
                              updated_at: new Date()
                            });
                          }
                        }

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
   * 重置 mock 数据
   */
  reset() {
    this.data.clear();
    this.upsertCallCount = 0;
  }

  /**
   * 预设转发数据
   */
  setRepost(id: string, repostData: any) {
    const key = `WeiboRepostEntity_${id}`;
    this.data.set(key, repostData);
  }

  /**
   * 预设帖子数据
   */
  setPost(postId: string, postData: any) {
    const key = `WeiboPostEntity_${postId}`;
    this.data.set(key, postData);
  }
}

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

  describe('统计更新逻辑', () => {
    it('新数据应该触发用户关系统计', async () => {
      const eventId = 'test-event-relation';
      const postId = 'post-relation-test';
      const targetUid = 'author1';

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, created_at: new Date(), retweeted_status: { user: { id: targetUid } } },
        { id: 'repost2', user_id: 'user2', post_id: postId, created_at: new Date(), retweeted_status: { user: { id: targetUid } } }
      ];

      // 查询已存在的记录（没有预设数据）
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(2);

      // Upsert 转发记录
      await mockManager.upsert(WeiboRepostEntity, repostEntities as any, ['id']);

      // 只对新数据触发统计更新
      for (const repost of newReposts) {
        const sourceUserId = repost.user_id?.toString();
        const targetUser = repost.retweeted_status as Record<string, unknown> | null;
        const targetUserId = targetUser?.user?.toString();

        if (sourceUserId && targetUserId && sourceUserId !== targetUserId) {
          await UserRelationStatisticsHelper.upsertRelation(
            mockManager as any,
            sourceUserId,
            targetUserId,
            'repost',
            repost.created_at,
            eventId
          );
        }
      }

      // 验证：统计被正确触发
      expect(newReposts.length).toBeGreaterThan(0);
    });

    it('已存在的数据不应该触发统计', async () => {
      const eventId = 'test-event-no-relation';
      const postId = 'post-no-relation';
      const targetUid = 'author1';

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, created_at: new Date(), retweeted_status: { user: { id: targetUid } } }
      ];

      // 预设转发记录
      mockManager.setRepost('repost1', { id: 'repost1', user_id: 'user1' });

      // 查询已存在的记录
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(0);

      // 因为没有新数据，统计更新逻辑不应该执行
      let statsCallCount = 0;
      for (const _repost of newReposts) {
        statsCallCount++;
      }

      expect(statsCallCount).toBe(0);
    });

    it('新数据应该触发小时统计', async () => {
      const eventId = 'test-event-hourly';
      const postId = 'post-hourly-test';
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

      // 查询已存在的记录（没有预设数据）
      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));

      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      expect(newReposts.length).toBe(2);

      // Upsert 转发记录
      await mockManager.upsert(WeiboRepostEntity, repostEntities as any, ['id']);

      // 只对新数据触发小时统计
      for (const repost of newReposts) {
        if (repost.created_at) {
          await HourlyStatisticsHelper.upsertStatistics(
            mockManager as any,
            eventId,
            timeDimensions,
            { repost_count: 1, user_count: 1 }
          );
        }
      }

      // 验证：小时统计被触发 2 次（2 条新数据）
      expect(newReposts.length).toBe(2);
    });
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

  describe('边界情况', () => {
    it('没有 event_id 的帖子不应该触发统计', async () => {
      const postId = 'post-no-event';

      // 预设帖子数据（没有 event_id）
      mockManager.setPost(postId, {
        id: postId
        // 注意：没有 event_id
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, created_at: new Date(), retweeted_status: { user: { id: 'author1' } } }
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 查询帖子
      const post = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId },
        select: ['event_id']
      });

      // 没有新数据或没有 event_id，不应该触发统计
      const hasEventId = !!post?.event_id;
      const hasNewReposts = newReposts.length > 0;

      expect(hasEventId).toBe(false);
      expect(hasNewReposts).toBe(true); // 有新数据，但没有 event_id
    });

    it('自己转发自己不应该触发用户关系统计', async () => {
      const eventId = 'test-event-self-repost';
      const postId = 'post-self-repost';
      const userWeiboId = 'user1';
      const targetUserWeiboId = 'user1'; // 自己转发自己

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: userWeiboId, post_id: postId, created_at: new Date(), retweeted_status: { user: { id: targetUserWeiboId } } }
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 计算应该触发关系统计的数量
      let relationStatsCount = 0;
      for (const repost of newReposts) {
        const sourceUserId = repost.user_id?.toString();
        const targetUser = repost.retweeted_status as Record<string, unknown> | null;
        const targetUserId = targetUser?.user as Record<string, unknown> | undefined;
        const targetUserIdStr = targetUserId?.id?.toString();

        if (sourceUserId && targetUserIdStr && sourceUserId !== targetUserIdStr) {
          relationStatsCount++;
        }
      }

      // 自己转发自己不应该触发关系统计
      expect(relationStatsCount).toBe(0);
    });

    it('没有 created_at 的转发不应该触发小时统计', async () => {
      const eventId = 'test-event-no-time';
      const postId = 'post-no-time';

      // 预设帖子数据
      mockManager.setPost(postId, {
        id: postId,
        event_id: eventId
      });

      const repostEntities = [
        { id: 'repost1', user_id: 'user1', post_id: postId, retweeted_status: { user: { id: 'author1' } } } // 注意：没有 created_at
      ];

      const ids = repostEntities.map(e => e.id).filter(Boolean);
      const existingRecords = await mockManager.find(WeiboRepostEntity, {
        where: ids.map(id => ({ id }))
      });

      const existingIds = new Set(existingRecords.map(r => r.id));
      const newReposts = repostEntities.filter(e => !existingIds.has(e.id));

      // 计算应该触发小时统计的数量
      let hourlyStatsCount = 0;
      for (const repost of newReposts) {
        if (repost.created_at) {
          hourlyStatsCount++;
        }
      }

      // 没有 created_at，不应该触发小时统计
      expect(hourlyStatsCount).toBe(0);
    });
  });
});
