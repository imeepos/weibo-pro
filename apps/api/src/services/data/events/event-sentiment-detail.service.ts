import { Injectable } from '@sker/core';
import {
  EventHourlyStatisticsEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';
import type {
  EventEmotionMapItem,
  EventSentimentTrendDetailedPoint,
  EventUserEmotionInsight,
} from './types';

type NlpRow = PostNLPResultEntity & {
  post?: {
    user_id?: string | number | null;
    user?: {
      screen_name?: string | null;
    } | null;
  } | null;
};

@Injectable({ providedIn: 'root' })
export class EventSentimentDetailService {
  async getEventEmotionMap(eventId: string): Promise<EventEmotionMapItem[]> {
    const rows = await this.getNlpRows(eventId);
    const emotionMap = new Map<string, number>();

    for (const row of rows) {
      for (const keyword of row.keywords || []) {
        emotionMap.set(
          keyword.keyword,
          (emotionMap.get(keyword.keyword) || 0) + Number(keyword.weight || 0),
        );
      }
    }

    return Array.from(emotionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([label, weight]) => ({
        label,
        weight: Math.round(weight * 100) / 100,
      }));
  }

  async getEventUserEmotionInsights(eventId: string): Promise<EventUserEmotionInsight[]> {
    const rows = await this.getNlpRows(eventId);
    const userMap = new Map<
      string,
      {
        userId: string;
        screenName: string;
        postCount: number;
        positive: number;
        negative: number;
      }
    >();

    for (const row of rows) {
      const userId = row.post?.user_id;
      if (!userId) {
        continue;
      }

      const key = String(userId);
      const current = userMap.get(key) || {
        userId: key,
        screenName: row.post?.user?.screen_name || '未知用户',
        postCount: 0,
        positive: 0,
        negative: 0,
      };

      current.postCount += 1;
      current.positive += Number(row.sentiment?.positive_prob || 0);
      current.negative += Number(row.sentiment?.negative_prob || 0);
      userMap.set(key, current);
    }

    return Array.from(userMap.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 10)
      .map((item) => {
        const averageDelta = (item.positive - item.negative) / item.postCount;
        const emotionTilt =
          averageDelta > 0.2 ? 'positive' : averageDelta < -0.2 ? 'negative' : 'neutral';

        return {
          userId: item.userId,
          screenName: item.screenName,
          postCount: item.postCount,
          emotionTilt,
          summary: `该用户在事件中发布 ${item.postCount} 条内容`,
        };
      });
  }

  async getEventSentimentTrendDetailed(
    eventId: string,
  ): Promise<EventSentimentTrendDetailedPoint[]> {
    return useEntityManager(async (manager) => {
      const stats = await manager
        .getRepository(EventHourlyStatisticsEntity)
        .createQueryBuilder('stats')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy('stats.year', 'ASC')
        .addOrderBy('stats.month', 'ASC')
        .addOrderBy('stats.day', 'ASC')
        .addOrderBy('stats.hour', 'ASC')
        .getMany();

      return stats.map((item: any) => ({
        timestamp: new Date(
          Date.UTC(
            Number(item.year),
            Number(item.month) - 1,
            Number(item.day),
            Number(item.hour),
          ),
        ).toISOString(),
        positive: Number(item.sentiment_positive || 0),
        negative: Number(item.sentiment_negative || 0),
        neutral: Number(item.sentiment_neutral || 0),
      }));
    });
  }

  private async getNlpRows(eventId: string): Promise<NlpRow[]> {
    return useEntityManager(async (manager) => {
      return manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .leftJoinAndSelect('nlp.post', 'post')
        .leftJoinAndSelect('post.user', 'user')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.id IS NOT NULL')
        .orderBy('nlp.created_at', 'DESC')
        .getMany() as Promise<NlpRow[]>;
    });
  }
}
