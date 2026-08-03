import type {
  EventDetail,
  TimeRange,
} from './types';
import type { EventQueryService } from './event-query.service';
import type { EventAnalyticsService } from './event-analytics.service';
import type { EventTimelineBuilder } from './event-timeline.builder';

/**
 * 组装事件详情：
 * - 查询事件基础信息、最新统计、全量统计与关键词
 * - 构建时间线、传播路径与关键节点
 * - 计算趋势方向与情感（带 fallback）
 */
export async function buildEventDetail(
  queryService: EventQueryService,
  analyticsService: EventAnalyticsService,
  timelineBuilder: EventTimelineBuilder,
  id: string,
): Promise<EventDetail> {
  const event = await queryService.getEventById(id);

  if (!event) {
    throw new Error(`事件不存在`);
  }

  const latestStats = await queryService.getLatestStatistics(id);
  const statistics = await queryService.getAllEventStatistics(id);
  const keywordsData = await queryService.getEventKeywords(id);

  const timeline = timelineBuilder.buildTimeline(event, statistics);
  const propagationPath = await analyticsService.buildPropagationPath(id);
  const keyNodes = timelineBuilder.buildKeyNodes(timeline);

  const trend =
    statistics.length >= 2 && statistics[0] && statistics[1]
      ? statistics[0].hotness > statistics[1].hotness
        ? 'up'
        : statistics[0].hotness < statistics[1].hotness
          ? 'down'
          : 'stable'
      : ('stable' as const);

  // 如果 stats 的 sentiment 是默认值且没有实际数据，fallback 到 event.sentiment
  const hasValidSentiment = latestStats?.sentiment && latestStats.sentiment.positive + latestStats.sentiment.negative > 0.01;
  const sentiment = hasValidSentiment
    ? latestStats!.sentiment
    : event.sentiment || { positive: 0, negative: 0, neutral: 0 };

  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    postCount: latestStats?.post_count || 0,
    userCount: latestStats?.user_count || 0,
    sentiment,
    hotness: event.hotness,
    trend,
    category: event.category?.name || '未分类',
    keywords: keywordsData.map((kw) => String(kw.keyword)).filter(k => k && k !== 'undefined' && k !== 'null'),
    createdAt: event.created_at.toISOString(),
    lastUpdate: event.updated_at.toISOString(),
    timeline,
    propagationPath,
    keyNodes,
  };
}
