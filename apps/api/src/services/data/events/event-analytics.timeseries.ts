import {
  EventHourlyStatisticsEntity,
} from '@sker/entities';
import type { EntityManager } from 'typeorm';
import type {
  TimeRange,
  TimeSeriesData,
} from './types';

/**
 * 获取单个事件的时间序列数据（帖子、用户、情感）。
 */
export async function fetchEventTimeSeries(
  entityManager: EntityManager,
  eventId: string,
  _timeRange: TimeRange,
): Promise<TimeSeriesData> {
  const stats = await entityManager
    .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
    .where('stats.event_id = :eventId', { eventId })
    .orderBy('stats.year', 'ASC')
    .addOrderBy('stats.month', 'ASC')
    .addOrderBy('stats.day', 'ASC')
    .addOrderBy('stats.hour', 'ASC')
    .getMany();

  const categories = stats.map((s) =>
    new Date(Date.UTC(s.year, s.month - 1, s.day, s.hour)).toISOString()
  );

  const postData = stats.map((s) => s.post_count || 0);
  const userData = stats.map((s) => s.user_count || 0);
  const positiveData = stats.map((s) => s.sentiment_positive || 0);
  const negativeData = stats.map((s) => s.sentiment_negative || 0);
  const neutralData = stats.map((s) => s.sentiment_neutral || 0);

  return {
    categories,
    series: [
      { name: '帖子数量', data: postData },
      { name: '用户参与', data: userData },
      { name: '正面情绪', data: positiveData },
      { name: '负面情绪', data: negativeData },
      { name: '中性情绪', data: neutralData },
    ],
  };
}
