import type { SpreadTimelinePoint } from '@sker/sdk';

/**
 * 构建传播时间线（按小时聚合，累计转发数）
 */
export function buildSpreadTimeline(reposts: Array<any>): SpreadTimelinePoint[] {
  if (reposts.length === 0) return [];

  // 按时间排序
  const sortedReposts = [...reposts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 按小时聚合
  const timelineMap = new Map<string, number>();
  for (const repost of sortedReposts) {
    const date = new Date(repost.createdAt);
    const hourKey = date.toISOString().slice(0, 13) + ':00:00';
    timelineMap.set(hourKey, (timelineMap.get(hourKey) || 0) + 1);
  }

  // 生成时间线
  const timeline: SpreadTimelinePoint[] = [];
  let cumulative = 0;
  for (const [timestamp, count] of timelineMap.entries()) {
    cumulative += count;
    timeline.push({ timestamp, count, cumulative });
  }

  return timeline;
}
