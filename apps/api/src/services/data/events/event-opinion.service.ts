import { Injectable } from '@sker/core';
import { PostNLPResultEntity, useEntityManager } from '@sker/entities';
import type { EventOpinionCluster } from './types';

type OpinionStance = EventOpinionCluster['stance'];

@Injectable({ providedIn: 'root' })
export class EventOpinionService {
  async getEventOpinionClusters(eventId: string): Promise<EventOpinionCluster[]> {
    return useEntityManager(async (manager) => {
      const rows = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .leftJoinAndSelect('nlp.post', 'post')
        .leftJoinAndSelect('post.user', 'user')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.text_raw IS NOT NULL')
        .orderBy(
          '(COALESCE(post.comments_count, 0) + COALESCE(post.reposts_count, 0) + COALESCE(post.attitudes_count, 0))',
          'DESC',
        )
        .getMany();

      if (!rows.length) {
        return [];
      }

      const buckets = new Map<OpinionStance, typeof rows>();
      buckets.set('supportive', []);
      buckets.set('critical', []);
      buckets.set('neutral', []);

      for (const row of rows) {
        const stance = this.getStance(row.sentiment?.overall);
        buckets.get(stance)?.push(row);
      }

      return Array.from(buckets.entries())
        .filter(([, items]) => items.length > 0)
        .map(([stance, items]) => ({
          id: stance,
          label: this.getLabel(stance),
          stance,
          summary: `${items.length} 条代表内容聚合为同一立场观点簇`,
          postCount: items.length,
          userCount: items.length,
          keywords: this.collectKeywords(items),
          representativePosts: items.slice(0, 3).map((item) => ({
            postId: item.post?.id ?? item.post_id,
            author: item.post?.user?.screen_name || '未知作者',
            excerpt: String(item.post?.text_raw || '').slice(0, 120),
            sentiment: item.sentiment?.overall || 'neutral',
            engagement:
              Number(item.post?.comments_count || 0) +
              Number(item.post?.reposts_count || 0) +
              Number(item.post?.attitudes_count || 0),
          })),
        }));
    });
  }

  private getStance(sentiment?: 'positive' | 'negative' | 'neutral'): OpinionStance {
    if (sentiment === 'positive') {
      return 'supportive';
    }
    if (sentiment === 'negative') {
      return 'critical';
    }
    return 'neutral';
  }

  private getLabel(stance: OpinionStance): string {
    if (stance === 'supportive') {
      return '支持观点';
    }
    if (stance === 'critical') {
      return '批评观点';
    }
    return '中性讨论';
  }

  private collectKeywords(rows: Array<PostNLPResultEntity>): string[] {
    const keywordWeights = new Map<string, number>();

    for (const row of rows) {
      for (const keyword of row.keywords || []) {
        keywordWeights.set(
          keyword.keyword,
          (keywordWeights.get(keyword.keyword) || 0) + Number(keyword.weight || 0),
        );
      }
    }

    return Array.from(keywordWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword]) => keyword);
  }
}
