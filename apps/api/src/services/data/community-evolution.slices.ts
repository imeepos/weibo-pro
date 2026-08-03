/**
 * 社区演化时间切片模块
 *
 * 负责查询事件的关系数据时间范围，并将事件数据按天划分为时间切片，
 * 每个时间切片内执行社区发现。
 */
import { useEntityManager } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';
import type { CommunityTimeSlice } from '@sker/sdk';
import { detectCommunities } from './community-evolution.graph';

/**
 * 查询事件的关系数据时间范围（最早/最晚关系创建时间）
 */
export async function queryEventTimeRange(manager: any, eventId: string) {
  return await manager
    .getRepository(UserRelationStatistics)
    .createQueryBuilder('relation')
    .select('MIN(relation.createdAt)', 'startTime')
    .addSelect('MAX(relation.createdAt)', 'endTime')
    .where('relation.eventId = :eventId', { eventId })
    .getRawOne();
}

/**
 * 按天创建时间切片
 *
 * 从事件开始时间到结束时间（最多 30 天），逐天查询关系数据，
 * 对每一天运行社区发现并生成一个时间切片。
 */
export async function createTimeSlices(
  eventId: string,
  startTime: string,
  endTime: string
): Promise<CommunityTimeSlice[]> {
  return useEntityManager(async (manager) => {
    const timeSlices: CommunityTimeSlice[] = [];
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 计算天数差异
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // 限制最多 30 天切片
    const maxDays = Math.min(daysDiff, 30);

    for (let day = 0; day <= maxDays; day++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + day);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // 查询该时间段的关系数据
      const relations = await manager
        .getRepository(UserRelationStatistics)
        .createQueryBuilder('relation')
        .select('relation.sourceUserId', 'sourceUserId')
        .addSelect('relation.targetUserId', 'targetUserId')
        .addSelect('SUM(relation.weight)', 'totalWeight')
        .where('relation.eventId = :eventId', { eventId })
        .andWhere('relation.createdAt >= :dayStart', { dayStart: dayStart.toISOString() })
        .andWhere('relation.createdAt < :dayEnd', { dayEnd: dayEnd.toISOString() })
        .groupBy('relation.sourceUserId, relation.targetUserId')
        .getRawMany();

      if (relations.length === 0) {
        continue;
      }

      // 运行社区发现
      const communities = await detectCommunities(relations);

      timeSlices.push({
        timestamp: dayStart.toISOString(),
        communities,
        modularity: 0, // TODO: 计算模块度
        totalMembers: communities.reduce((sum, c) => sum + c.size, 0),
      });
    }

    return timeSlices;
  });
}
