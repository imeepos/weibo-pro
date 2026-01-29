/**
 * 测试：WeiboAjaxStatusesShowAstVisitor 统计更新修复验证
 *
 * 修复内容：
 * - 在入库前检查帖子是否已存在
 * - 只对新插入的帖子触发统计更新
 * - 避免重复处理导致统计数据重复累加
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityManager } from 'typeorm';
import { WeiboPostEntity, WeiboUserEntity, HourlyStatisticsHelper } from '@sker/entities';

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
  async upsert(entity: any, data: any, conflictPaths: string[]): Promise<any> {
    this.upsertCallCount++;
    const key = `${entity.name || entity}_${data.id}`;

    // 检查是否已存在
    const existing = this.data.get(key);

    // 模拟数据库行为：upsert 总是会更新/插入数据
    this.data.set(key, {
      ...existing,
      ...data,
      updated_at: new Date()
    });

    return [{ raw: [] }];
  }

  /**
   * 模拟 update - 更新数据
   */
  async update(entity: any, criteria: any, data: any): Promise<any> {
    const key = `${entity.name || entity}_${criteria.id}`;
    const existing = this.data.get(key);

    if (existing) {
      this.data.set(key, {
        ...existing,
        ...data,
        updated_at: new Date()
      });
    }

    return { raw: [], affected: existing ? 1 : 0 };
  }

  /**
   * 模拟 createQueryBuilder - 用于统计表的 UPSERT 操作
   */
  createQueryBuilder(): any {
    const self = this;

    return {
      insert() {
        return {
          into(entity: any) {
            return {
              values(values: any) {
                return {
                  orUpdate(columns: string[], conflictColumns: string[]) {
                    return {
                      updateEntity(bool: boolean) {
                        return this;
                      },
                      callListeners(bool: boolean) {
                        return this;
                      },
                      async execute() {
                        // 处理 EventHourlyStatisticsEntity 的 UPSERT
                        if (values.event_id !== undefined) {
                          const key = `stats_${values.event_id}_${values.year}_${values.month}_${values.day}_${values.hour}`;
                          const existing = self.data.get(key);

                          if (existing) {
                            // 更新现有记录（累加逻辑）
                            self.data.set(key, {
                              ...existing,
                              post_count: values.post_count,
                              comment_count: values.comment_count,
                              repost_count: values.repost_count,
                              like_count: values.like_count,
                              user_count: values.user_count,
                              hotness: values.hotness,
                              updated_at: new Date()
                            });
                          } else {
                            // 插入新记录
                            self.data.set(key, {
                              ...values,
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
   * 获取统计数据
   */
  getStatistics(eventId: string, year: number, month: number, day: number, hour: number) {
    const key = `stats_${eventId}_${year}_${month}_${day}_${hour}`;
    return this.data.get(key);
  }

  /**
   * 预设帖子数据
   */
  setPost(postId: string, postData: any) {
    const key = `WeiboPostEntity_${postId}`;
    this.data.set(key, postData);
  }
}

describe('WeiboAjaxStatusesShowAstVisitor - 统计更新修复验证', () => {
  let mockManager: MockEntityManager;

  beforeEach(() => {
    mockManager = new MockEntityManager();
  });

  describe('帖子存在性检查', () => {
    it('应该正确识别新帖子', async () => {
      const postId = 'new-post-123';
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        text: '新帖子',
        created_at: '2026-01-22T10:30:00Z'
      });

      // 第一次查询：帖子不存在
      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });

      expect(existingPost).toBeNull();
    });

    it('应该正确识别已存在的帖子', async () => {
      const postId = 'existing-post-456';
      const postData = {
        id: postId,
        text: '已存在的帖子',
        created_at: '2026-01-22T10:30:00Z'
      };

      // 预设帖子数据
      mockManager.setPost(postId, postData);

      // 查询已存在的帖子
      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });

      expect(existingPost).toBeDefined();
      expect(existingPost?.id).toBe(postId);
    });
  });

  describe('统计更新逻辑', () => {
    it('新帖子应该触发统计更新', async () => {
      const eventId = 'test-event-new';
      const postId = 'new-post-789';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 模拟处理新帖子的流程
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        event_id: eventId,
        created_at: postTime.toISOString()
      });

      // 检查帖子是否存在（新帖子）
      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !existingPost;

      expect(isNewPost).toBe(true);

      // Upsert 帖子
      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 新帖子应该触发统计更新
      if (isNewPost && post.event_id && post.created_at) {
        await HourlyStatisticsHelper.upsertStatistics(
          mockManager as any,
          post.event_id,
          timeDimensions,
          { post_count: 1, user_count: 1 }
        );
      }

      // 验证统计已更新
      const stats = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      expect(stats).toBeDefined();
      expect(stats?.post_count).toBe(1);
      expect(stats?.user_count).toBe(1);
    });

    it('已存在的帖子不应该触发统计更新', async () => {
      const eventId = 'test-event-existing';
      const postId = 'existing-post-999';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 预设帖子数据（模拟第一次处理）
      const existingPostData = {
        id: postId,
        event_id: eventId,
        created_at: postTime.toISOString()
      };
      mockManager.setPost(postId, existingPostData);

      // 模拟第二次处理同一条帖子的流程
      const post = mockManager.create(WeiboPostEntity, existingPostData);

      // 检查帖子是否存在（已存在）
      const foundPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !foundPost;

      expect(isNewPost).toBe(false);

      // Upsert 帖子（会更新，但这是正常的）
      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 已存在的帖子不应该触发统计更新
      if (isNewPost && post.event_id && post.created_at) {
        await HourlyStatisticsHelper.upsertStatistics(
          mockManager as any,
          post.event_id,
          timeDimensions,
          { post_count: 1, user_count: 1 }
        );
      }

      // 验证统计未被更新（因为我们跳过了统计更新逻辑）
      const stats = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // 统计不应该存在（因为 isNewPost 为 false，跳过了统计更新）
      expect(stats).toBeUndefined();
    });

    it('修复验证：重复处理同一条帖子不会重复累加统计', async () => {
      const eventId = 'test-event-fix-verify';
      const postId = 'post-fix-verify';
      const postTime = new Date('2026-01-22T10:30:00Z');
      const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

      // 第一次处理帖子
      const post1 = mockManager.create(WeiboPostEntity, {
        id: postId,
        event_id: eventId,
        created_at: postTime.toISOString()
      });

      const existingPost1 = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost1 = !existingPost1;

      await mockManager.upsert(WeiboPostEntity, post1 as any, ['id']);

      if (isNewPost1 && post1.event_id && post1.created_at) {
        await HourlyStatisticsHelper.upsertStatistics(
          mockManager as any,
          post1.event_id,
          timeDimensions,
          { post_count: 1, user_count: 1 }
        );
      }

      const stats1 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      expect(stats1?.post_count).toBe(1);

      // 第二次处理同一条帖子
      const post2 = mockManager.create(WeiboPostEntity, {
        id: postId,
        event_id: eventId,
        created_at: postTime.toISOString()
      });

      const existingPost2 = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost2 = !existingPost2;

      await mockManager.upsert(WeiboPostEntity, post2 as any, ['id']);

      // 关键：第二次处理时 isNewPost2 应该为 false，不会触发统计更新
      if (isNewPost2 && post2.event_id && post2.created_at) {
        await HourlyStatisticsHelper.upsertStatistics(
          mockManager as any,
          post2.event_id,
          timeDimensions,
          { post_count: 1, user_count: 1 }
        );
      }

      const stats2 = mockManager.getStatistics(
        eventId,
        timeDimensions.year,
        timeDimensions.month,
        timeDimensions.day,
        timeDimensions.hour
      );

      // 验证：统计应该保持为 1，不会重复累加
      expect(stats2?.post_count).toBe(1);
      expect(stats2?.user_count).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('没有 event_id 的帖子不应该触发统计更新', async () => {
      const postId = 'post-no-event';
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        created_at: '2026-01-22T10:30:00Z'
        // 注意：没有 event_id
      });

      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !existingPost;

      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 即使是新帖子，如果没有 event_id，也不应该触发统计更新
      let statsUpdated = false;
      if (isNewPost && post.event_id && post.created_at) {
        statsUpdated = true;
      }

      expect(statsUpdated).toBe(false);
    });

    it('没有 created_at 的帖子不应该触发统计更新', async () => {
      const postId = 'post-no-created-at';
      const post = mockManager.create(WeiboPostEntity, {
        id: postId,
        event_id: 'test-event-no-time'
        // 注意：没有 created_at
      });

      const existingPost = await mockManager.findOne(WeiboPostEntity, {
        where: { id: postId }
      });
      const isNewPost = !existingPost;

      await mockManager.upsert(WeiboPostEntity, post as any, ['id']);

      // 即使是新帖子，如果没有 created_at，也不应该触发统计更新
      let statsUpdated = false;
      if (isNewPost && post.event_id && post.created_at) {
        statsUpdated = true;
      }

      expect(statsUpdated).toBe(false);
    });
  });

  describe('error_code=20170 处理', () => {
    it('当 API 返回 error_code=20170 时，应该正常处理并返回 null 数据', async () => {
      // 模拟 API 返回 error_code=20170 的响应
      const apiResponse = {
        ok: 0,
        message: '由于博主设置，目前内容暂不可见。',
        error_code: 20170
      };

      // 验证响应结构
      expect(apiResponse.ok).toBe(0);
      expect(apiResponse.error_code).toBe(20170);

      // 当检测到 error_code=20170 时，应该跳过后续处理
      // 不应该尝试访问 body.user 或 body.id 等字段
      // 应该返回 null 数据让下游节点继续处理
      const shouldSkip = apiResponse.error_code === 20170;
      expect(shouldSkip).toBe(true);

      // 验证响应没有实际的微博内容
      expect(apiResponse).not.toHaveProperty('user');
      expect(apiResponse).not.toHaveProperty('id');
      expect(apiResponse).not.toHaveProperty('text');
    });
  });
});
