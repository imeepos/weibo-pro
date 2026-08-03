/**
 * Mock EntityManager 用于 WeiboAjaxStatusesLikeShowAstVisitor 测试
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 模拟 find / findOne / create / upsert / createQueryBuilder(UPSERT) 行为，
 *   用内存 Map 存储 WeiboLikeEntity / WeiboPostEntity 数据。
 */
import { EntityManager } from 'typeorm';
import { WeiboLikeEntity, WeiboPostEntity, WeiboUserEntity } from '@sker/entities';

/**
 * Mock EntityManager 用于测试
 */
export class MockEntityManager extends EntityManager {
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
        const key = `${entity.name || entity}_${condition.userWeiboId}_${condition.targetWeiboId}`;
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
      if (entity.name === 'WeiboLikeEntity') {
        const key = `${entity.name}_${item.userWeiboId}_${item.targetWeiboId}`;
        const existing = this.data.get(key);

        this.data.set(key, {
          ...existing,
          ...item,
          updated_at: new Date()
        });
      } else if (entity.name === WeiboUserEntity.name) {
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
   * 预设点赞数据
   */
  setLike(userWeiboId: string, targetWeiboId: string, likeData: any) {
    const key = `WeiboLikeEntity_${userWeiboId}_${targetWeiboId}`;
    this.data.set(key, likeData);
  }

  /**
   * 预设帖子数据
   */
  setPost(postId: string, postData: any) {
    const key = `WeiboPostEntity_${postId}`;
    this.data.set(key, postData);
  }
}
