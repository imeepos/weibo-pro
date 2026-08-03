/**
 * WeiboAjaxStatusesShowAstVisitor 测试用 Mock EntityManager
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 模拟 findOne / create / upsert / update / createQueryBuilder(UPSERT) 行为，
 *   用内存 Map 存储数据，支持统计表的 UPSERT 累加。
 */
import { EntityManager } from 'typeorm';

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
  async upsert(entity: any, data: any, _conflictPaths: string[]): Promise<any> {
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
