/**
 * Mock EntityManager 用于 WeiboAjaxStatusesCommentAstVisitor 测试
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 模拟 find / findOne / create / upsert / createQueryBuilder(UPSERT) 行为，
 *   用内存 Map 存储 WeiboCommentEntity / WeiboPostEntity / 统计数据。
 */
import { EntityManager } from 'typeorm';
import { WeiboCommentEntity, WeiboPostEntity, WeiboUserEntity, UserRelationType } from '@sker/entities';

/**
 * Mock EntityManager 用于测试
 */
export class MockEntityManager extends EntityManager {
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
