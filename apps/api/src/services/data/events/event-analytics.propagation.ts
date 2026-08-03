import {
  PostNLPResultEntity,
} from '@sker/entities';
import type {
  EventPropagationPath,
} from './types';

/**
 * 构建事件传播路径：按用户粉丝数区分用户类型，统计真实数据。
 */
export async function fetchPropagationPath(
  entityManager: any,
  eventId: string,
): Promise<EventPropagationPath[]> {
  const userStats = await entityManager
    .createQueryBuilder(PostNLPResultEntity, 'nlp')
    .innerJoin('nlp.post', 'post')
    .innerJoin('post.user', 'user')
    .select(
      `CASE
        WHEN user.followers_count >= 100000 THEN '意见领袖'
        WHEN user.followers_count >= 10000 THEN '活跃用户'
        WHEN user.followers_count >= 1000 THEN '普通用户'
        ELSE '围观群众'
      END`,
      'usertype'
    )
    .addSelect('COUNT(DISTINCT user.id)', 'usercount')
    .addSelect('COUNT(post.id)', 'postcount')
    .addSelect(
      'AVG(post.attitudes_count + post.comments_count + post.reposts_count)',
      'avginteraction'
    )
    .where('nlp.event_id = :eventId', { eventId })
    .andWhere('post.deleted_at IS NULL')
    .groupBy('usertype')
    .orderBy('usercount', 'DESC')
    .getRawMany();

  if (userStats.length === 0) {
    return [];
  }

  return userStats.map((stat: {
    usertype: string;
    usercount: string;
    postcount: string;
    avginteraction: string;
  }) => {
    const userCount = parseInt(stat.usercount || '0', 10);
    const avgInteraction = parseFloat(stat.avginteraction || '0');
    // 影响力基于平均互动量计算
    const influence = Math.min(100, Math.round(Math.log10(avgInteraction + 1) * 25));

    return {
      userType: stat.usertype,
      userCount,
      postCount: parseInt(stat.postcount || '0', 10),
      influence: Math.max(influence, 10), // 最低影响力 10
    };
  });
}
