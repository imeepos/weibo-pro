/**
 * Mock EntityManager 用于统计表重复更新问题测试
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 模拟 findOne / createQueryBuilder(UPSERT) 行为，用内存 Map 存储数据。
 */
import { EntityManager } from 'typeorm';
import { UserRelationType } from '@sker/entities';

/**
 * Mock EntityManager 用于测试
 */
class MockEntityManager extends EntityManager {
  public data: Map<string, any> = new Map();
  public callCount: Map<string, number> = new Map();

  constructor() {
    super();
  }

  /**
   * 模拟 findOne - 从内存存储中查找
   */
  async findOne(entity: any, options?: any): Promise<any> {
    const key = this.buildKey(entity.name || entity, options?.where);
    this.incrementCallCount('findOne');

    if (options?.where?.id && this.data.has(key)) {
      return this.data.get(key);
    }

    // 模拟查找统计数据
    if (entity.name === 'EventHourlyStatisticsEntity' || entity === 'event_hourly_statistics') {
      const statsKey = `stats_${options?.where?.event_id}_${options?.where?.year}_${options?.where?.month}_${options?.where?.day}_${options?.where?.hour}`;
      return this.data.get(statsKey) || null;
    }

    // 模拟查找用户关系统计
    if (entity.name === 'UserRelationStatistics' || entity === 'user_relation_statistics') {
      const relationKey = `relation_${options?.where?.sourceUserId}_${options?.where?.targetUserId}_${options?.where?.relationType}_${options?.where?.eventId}`;
      return this.data.get(relationKey) || null;
    }

    return null;
  }

  /**
   * 模拟 createQueryBuilder - 用于 UPSERT 操作
   */
  createQueryBuilder(): any {
    const self = this;
    this.incrementCallCount('createQueryBuilder');

    return {
      insert() {
        return {
          into(_entity: any) {
            return {
              values(values: any) {
                return {
                  orUpdate(columns: string[], conflictColumns: string[]) {
                    return {
                      updateEntity(_bool: boolean) {
                        return this;
                      },
                      callListeners(_bool: boolean) {
                        return this;
                      },
                      async execute() {
                        self.incrementCallCount('upsert');
                        self.handleUpsert(values, conflictColumns);
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
   * 处理 UPSERT 逻辑
   */
  private handleUpsert(values: any, _conflictColumns: string[]) {
    // 处理 EventHourlyStatisticsEntity 的 UPSERT
    if (values.event_id !== undefined) {
      const key = `stats_${values.event_id}_${values.year}_${values.month}_${values.day}_${values.hour}`;
      const existing = this.data.get(key);

      if (existing) {
        // 更新现有记录（累加逻辑）
        this.data.set(key, {
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
        this.data.set(key, {
          ...values,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // 处理 UserRelationStatistics 的 UPSERT
    if (values.sourceUserId !== undefined) {
      const key = `relation_${values.sourceUserId}_${values.targetUserId}_${values.relationType}_${values.eventId}`;
      const existing = this.data.get(key);

      if (existing) {
        // 更新现有记录（累加逻辑）
        this.data.set(key, {
          ...existing,
          weight: values.weight,
          firstInteractionAt: values.firstInteractionAt,
          lastInteractionAt: values.lastInteractionAt,
          updated_at: new Date()
        });
      } else {
        // 插入新记录
        this.data.set(key, {
          ...values,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }

  /**
   * 构建存储键
   */
  private buildKey(entity: string, where?: any): string {
    if (!where) return entity;
    return `${entity}_${JSON.stringify(where)}`;
  }

  /**
   * 记录调用次数
   */
  private incrementCallCount(method: string) {
    const count = this.callCount.get(method) || 0;
    this.callCount.set(method, count + 1);
  }

  /**
   * 获取调用次数
   */
  getCallCount(method: string): number {
    return this.callCount.get(method) || 0;
  }

  /**
   * 重置 mock 数据
   */
  reset() {
    this.data.clear();
    this.callCount.clear();
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
}

export { MockEntityManager };
