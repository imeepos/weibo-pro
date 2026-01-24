import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm'
import { WorkflowScheduleEntity } from '../workflow-schedule.entity'
import { RedisClient } from '@sker/redis'
import { root } from '@sker/core'

type ScheduleChangeType = 'insert' | 'update' | 'delete'

interface ScheduleChangeMessage {
  type: ScheduleChangeType
  scheduleId: string
}

/**
 * WorkflowSchedule 变更订阅者
 *
 * 存在即合理：
 * - 监听调度表的变更事件
 * - 通过 Redis Pub/Sub 跨进程通知 Crawler 服务
 * - 实现调度动态加载，无需重启
 */
@EventSubscriber()
export class WorkflowScheduleSubscriber implements EntitySubscriberInterface<WorkflowScheduleEntity> {
  /**
   * 指定监听的实体
   */
  listenTo() {
    return WorkflowScheduleEntity
  }

  /**
   * INSERT 事件
   */
  async afterInsert(event: InsertEvent<WorkflowScheduleEntity>): Promise<void> {
    await this.publishChange('insert', event.entity.id)
  }

  /**
   * UPDATE 事件
   *
   * 注意：TypeORM 的 update() 方法不会加载完整实体
   * - event.entity 只包含传入的更新字段
   * - event.databaseEntity 可能为空
   * - 需要从 databaseEntity.id 或 entity.id 获取 ID
   */
  async afterUpdate(event: UpdateEvent<WorkflowScheduleEntity>): Promise<void> {
    // 优先从 databaseEntity 获取 ID（update() 方法会设置）
    // 其次从 entity 获取（save() 方法会设置）
    const scheduleId = event.databaseEntity?.id || (event.entity as WorkflowScheduleEntity)?.id;

    if (!scheduleId) {
      console.warn('[WorkflowScheduleSubscriber] afterUpdate: 无法获取 scheduleId，跳过发布', {
        hasEntity: !!event.entity,
        hasDatabaseEntity: !!event.databaseEntity,
        tableName: event.metadata?.tableName
      });
      return;
    }

    // 合并实体信息用于日志
    // 优先使用 entity（更新后的数据），其次使用 databaseEntity（更新前的数据）
    const entity = event.entity || event.databaseEntity;

    console.log('[WorkflowScheduleSubscriber] 发布调度更新通知', {
      scheduleId,
      scheduleName: entity?.name ?? '(未知)',
      lastRunAt: entity?.lastRunAt instanceof Date ? entity.lastRunAt.toISOString() : entity?.lastRunAt,
      nextRunAt: entity?.nextRunAt instanceof Date ? entity.nextRunAt.toISOString() : entity?.nextRunAt,
      status: entity?.status
    });

    await this.publishChange('update', scheduleId);
  }

  /**
   * DELETE 事件
   */
  async afterRemove(event: RemoveEvent<WorkflowScheduleEntity>): Promise<void> {
    if (!event.entityId) return
    await this.publishChange('delete', event.entityId)
  }

  /**
   * 发布变更消息到 Redis
   */
  private async publishChange(type: ScheduleChangeType, scheduleId: string): Promise<void> {
    try {
      const message: ScheduleChangeMessage = { type, scheduleId }
      const redis = root.get(RedisClient)
      await redis.publish('workflow_schedule_change', JSON.stringify(message))
    } catch (error) {
      console.error('发布调度变更消息失败:', error)
    }
  }
}
