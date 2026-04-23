import { Injectable } from '@sker/core';
import {
  EventHourlyStatisticsEntity,
  WeiboPostEntity,
  useEntityManager,
} from '@sker/entities';
import type { EventMilestone } from './types';

@Injectable({ providedIn: 'root' })
export class EventMilestoneService {
  async getEventMilestones(eventId: string): Promise<EventMilestone[]> {
    return useEntityManager(async (manager) => {
      const stats = await manager
        .getRepository(EventHourlyStatisticsEntity)
        .createQueryBuilder('stats')
        .select('stats.year', 'year')
        .addSelect('stats.month', 'month')
        .addSelect('stats.day', 'day')
        .addSelect('stats.hour', 'hour')
        .addSelect('stats.hotness', 'hotness')
        .addSelect('stats.post_count', 'post_count')
        .addSelect('stats.user_count', 'user_count')
        .addSelect('stats.sentiment_positive', 'sentiment_positive')
        .addSelect('stats.sentiment_negative', 'sentiment_negative')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy('stats.year', 'ASC')
        .addOrderBy('stats.month', 'ASC')
        .addOrderBy('stats.day', 'ASC')
        .addOrderBy('stats.hour', 'ASC')
        .getRawMany();

      if (!stats.length) return [];

      const avgHotness =
        stats.reduce((sum: number, row: any) => sum + Number(row.hotness || 0), 0) / stats.length;

      const candidates = stats.filter(
        (row: any) => Number(row.hotness || 0) >= Math.max(avgHotness * 1.5, 50),
      );

      const milestones = await Promise.all(
        candidates.slice(0, 6).map(async (row: any) => {
          const timestamp = new Date(
            Date.UTC(
              Number(row.year),
              Number(row.month) - 1,
              Number(row.day),
              Number(row.hour),
            ),
          ).toISOString();

          const posts = await manager
            .getRepository(WeiboPostEntity)
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .select([
              'post.id',
              'post.text_raw',
              'post.comments_count',
              'post.reposts_count',
              'post.attitudes_count',
              'user.id',
              'user.screen_name',
            ])
            .where('post.event_id = :eventId', { eventId })
            .andWhere('post.created_at >= :start', { start: timestamp })
            .andWhere('post.deleted_at IS NULL')
            .orderBy(
              '(post.comments_count + post.reposts_count + post.attitudes_count)',
              'DESC',
            )
            .limit(3)
            .getMany();

          return {
            timestamp,
            type: 'heat_spike',
            title: '热度峰值',
            summary: '热度在该时间窗出现明显抬升。',
            confidence: 0.8,
            metrics: {
              hotness: Number(row.hotness || 0),
              postCount: Number(row.post_count || 0),
              userCount: Number(row.user_count || 0),
              sentimentShift:
                Number(row.sentiment_negative || 0) -
                Number(row.sentiment_positive || 0),
            },
            representativePosts: posts.map((post: any) => ({
              postId: post.id,
              author: post.user?.screen_name || '未知作者',
              excerpt: String(post.text_raw || '').slice(0, 120),
              engagement:
                Number(post.comments_count || 0) +
                Number(post.reposts_count || 0) +
                Number(post.attitudes_count || 0),
            })),
          } satisfies EventMilestone;
        }),
      );

      return milestones;
    });
  }
}
