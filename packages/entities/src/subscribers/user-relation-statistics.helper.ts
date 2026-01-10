import { EntityManager } from 'typeorm';
import { UserRelationStatistics, UserRelationType } from '../user-relation-statistics.entity';

/**
 * 用户关系统计工具类
 *
 * 存在即合理：
 * - 纯增量逻辑，每次调用 weight +1
 * - 利用数据库唯一索引处理并发
 * - 自动更新首次/最后交互时间
 */
export class UserRelationStatisticsHelper {
  /**
   * UPSERT 用户关系统计
   */
  static async upsertRelation(
    manager: EntityManager,
    sourceUserId: string,
    targetUserId: string,
    relationType: UserRelationType,
    interactionTime: Date,
    eventId: string
  ): Promise<void> {
    const existing = await manager.findOne(UserRelationStatistics, {
      where: { sourceUserId, targetUserId, relationType, eventId }
    });

    const weight = (existing?.weight || 0) + 1;
    const firstInteractionAt = existing?.firstInteractionAt
      ? new Date(Math.min(existing.firstInteractionAt.getTime(), interactionTime.getTime()))
      : interactionTime;
    const lastInteractionAt = new Date(Math.max(
      existing?.lastInteractionAt?.getTime() || 0,
      interactionTime.getTime()
    ));

    await manager
      .createQueryBuilder()
      .insert()
      .into(UserRelationStatistics)
      .values({
        sourceUserId,
        targetUserId,
        relationType,
        eventId,
        weight,
        firstInteractionAt,
        lastInteractionAt,
      })
      .orUpdate(
        ['weight', 'first_interaction_at', 'last_interaction_at', 'updated_at'],
        ['source_user_id', 'target_user_id', 'relation_type', 'event_id']
      )
      .updateEntity(false)
      .callListeners(false)
      .execute();
  }
}
