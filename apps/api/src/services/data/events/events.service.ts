import { Injectable, Inject } from '@sker/core';
import type {
  HotEvent,
  TimeRange,
  EventListItem,
  EventDetail,
  TrendDataSeries,
  EventCategoryStats,
  TimeSeriesData,
  TrendAnalysis,
  InfluenceUser,
  GeographicDistribution,
  EventSentimentHotness,
  EventSentimentDistribution,
  EventSentimentIntensity,
  EventKeywordTimeSeries,
  EventKeywordBySentiment,
  EventNegativeKeywordAlert,
  EventEventTypeDistribution,
  EventEngagementTrend,
  EventAnomaly,
  EventPeak,
  UserRelationNetwork,
} from './types';
import { EventQueryService } from './event-query.service';
import { EventAnalyticsService } from './event-analytics.service';
import { EventTimelineBuilder } from './event-timeline.builder';
import { DataSource, EventEntity } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    @Inject(EventQueryService)
    private readonly queryService: EventQueryService,
    @Inject(EventAnalyticsService)
    private readonly analyticsService: EventAnalyticsService,
    @Inject(EventTimelineBuilder)
    private readonly timelineBuilder: EventTimelineBuilder,
    @Inject(DataSource) private dataSource: DataSource
  ) { }

  async getEventList(
    timeRange?: TimeRange,
    pagination?: { page: number; pageSize: number; search?: string; category?: string; lambda?: number }
  ): Promise<{
    data: EventListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return this.queryService.getEventList(timeRange, pagination);
  }

  async getHotList(timeRange: TimeRange): Promise<HotEvent[]> {
    return this.queryService.getHotEvents(timeRange);
  }

  async getEventCategories(
    timeRange: TimeRange
  ): Promise<EventCategoryStats> {
    return this.queryService.getEventCategories(timeRange);
  }

  async getTrendData(timeRange: TimeRange): Promise<TrendDataSeries> {
    return await this.analyticsService.getTrendData(timeRange);
  }

  async getEventDetail(id: string): Promise<EventDetail> {
    const event = await this.queryService.getEventById(id);

    if (!event) {
      throw new Error(`事件不存在`)
    }

    const latestStats = await this.queryService.getLatestStatistics(id);
    const statistics = await this.queryService.getAllEventStatistics(id);
    const keywordsData = await this.queryService.getEventKeywords(id);

    const timeline = this.timelineBuilder.buildTimeline(event, statistics);
    const propagationPath = await this.analyticsService.buildPropagationPath(id);
    const keyNodes = this.timelineBuilder.buildKeyNodes(timeline);

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
      keywords: keywordsData.map((kw) => kw.keyword),
      createdAt: event.created_at.toISOString(),
      lastUpdate: event.updated_at.toISOString(),
      timeline,
      propagationPath,
      keyNodes,
    };
  }

  async getEventTimeSeries(id: string): Promise<TimeSeriesData> {
    return await this.analyticsService.getEventTimeSeries(id, '30d');
  }

  async getEventTrends(id: string): Promise<TrendAnalysis> {
    return await this.analyticsService.getEventTrends(id, '30d');
  }

  async getInfluenceUsers(id: string): Promise<InfluenceUser[]> {
    return await this.queryService.getInfluenceUsers(id);
  }

  async getEventGeographic(id: string): Promise<GeographicDistribution[]> {
    return await this.queryService.getGeographicDistribution(id);
  }

  async getEventKeywords(
    id: string,
    limit?: number
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    return await this.queryService.getEventKeywords(id, limit);
  }

  // 新增：NLP 深度分析接口

  async getSentimentHotness(id: string): Promise<EventSentimentHotness[]> {
    return await this.queryService.getSentimentHotness(id);
  }

  async getSentimentDistribution(id: string): Promise<EventSentimentDistribution> {
    return await this.queryService.getSentimentDistribution(id);
  }

  async getSentimentIntensity(id: string): Promise<EventSentimentIntensity[]> {
    return await this.queryService.getSentimentIntensity(id);
  }

  async getKeywordsTimeSeries(id: string, topN?: number): Promise<EventKeywordTimeSeries[]> {
    return await this.queryService.getKeywordsTimeSeries(id, topN);
  }

  async getKeywordsBySentiment(id: string): Promise<EventKeywordBySentiment[]> {
    return await this.queryService.getKeywordsBySentiment(id);
  }

  async getNegativeKeywords(id: string, threshold?: number): Promise<EventNegativeKeywordAlert[]> {
    return await this.queryService.getNegativeKeywords(id, threshold);
  }

  async getEventTypes(id: string): Promise<EventEventTypeDistribution[]> {
    return await this.queryService.getEventTypes(id);
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标接口

  async getEngagementTrend(id: string, limit?: number): Promise<EventEngagementTrend[]> {
    return await this.queryService.getEngagementTrend(id, limit);
  }

  async getAnomalies(id: string, limit?: number): Promise<EventAnomaly[]> {
    return await this.queryService.getAnomalies(id, limit);
  }

  async getPeaks(id: string, limit?: number): Promise<EventPeak[]> {
    return await this.queryService.getPeaks(id, limit);
  }

  async getEventUserRelations(id: string): Promise<UserRelationNetwork> {
    return await this.queryService.getEventUserRelations(id);
  }

  async updateEventKeywords(id: string, keywords: string[]): Promise<{ success: boolean }> {
    const repo = this.dataSource.getRepository(EventEntity);
    await repo.update({ id }, { keywords });
    return { success: true };
  }

  async updateEventOccurredAt(id: string, occurredAt: string | null): Promise<{ success: boolean }> {
    const repo = this.dataSource.getRepository(EventEntity);
    await repo.update({ id }, { occurred_at: occurredAt ? new Date(occurredAt) : null });
    return { success: true };
  }
}
