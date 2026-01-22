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
   */
  async afterUpdate(event: UpdateEvent<WorkflowScheduleEntity>): Promise<void> {
    // 修复：使用 databaseEntity 作为备选
    // event.entity 可能为空，但 databaseEntity 包含更新后的数据
    const entity = event.entity || event.databaseEntity;
    if (!entity) {
      // UpdateEvent 中没有 entityId，使用 metadata 记录
      console.warn('[WorkflowScheduleSubscriber] afterUpdate: entity is null,无法发布更新通知', {
        metadata: event.metadata?.tableName
      });
      return;
    }

    console.log('[WorkflowScheduleSubscriber] 发布调度更新通知', {
      scheduleId: entity.id,
      scheduleName: entity.name,
      lastRunAt: entity.lastRunAt?.toISOString(),
      nextRunAt: entity.nextRunAt?.toISOString(),
      status: entity.status
    });

    await this.publishChange('update', entity.id);
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
