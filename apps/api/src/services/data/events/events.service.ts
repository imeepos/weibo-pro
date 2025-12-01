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
} from './types';
import { EventQueryService } from './event-query.service';
import { EventAnalyticsService } from './event-analytics.service';
import { EventTimelineBuilder } from './event-timeline.builder';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    @Inject(EventQueryService)
    private readonly queryService: EventQueryService,
    @Inject(EventAnalyticsService)
    private readonly analyticsService: EventAnalyticsService,
    @Inject(EventTimelineBuilder)
    private readonly timelineBuilder: EventTimelineBuilder
  ) { }

  async getEventList(
    timeRange: TimeRange,
    params?: { category?: string; search?: string; limit?: number }
  ): Promise<EventListItem[]> {
    return this.queryService.getEventList(timeRange, params);
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
    const propagationPath = this.analyticsService.buildPropagationPath(event);
    const keyNodes = this.timelineBuilder.buildKeyNodes(timeline);
    const developmentPhases = this.timelineBuilder.buildDevelopmentPhases(
      event,
      statistics
    );
    const developmentPattern = this.timelineBuilder.buildDevelopmentPattern(
      event,
      statistics
    );
    const successFactors = this.timelineBuilder.buildSuccessFactors(event);

    const trend =
      statistics.length >= 2 && statistics[0] && statistics[1]
        ? statistics[0].hotness > statistics[1].hotness
          ? 'up'
          : statistics[0].hotness < statistics[1].hotness
            ? 'down'
            : 'stable'
        : ('stable' as const);

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      postCount: latestStats?.post_count || 0,
      userCount: latestStats?.user_count || 0,
      sentiment:
        latestStats?.sentiment ||
        event.sentiment || { positive: 0, negative: 0, neutral: 0 },
      hotness: event.hotness,
      trend,
      category: event.category?.name || '未分类',
      keywords: keywordsData.map((kw) => kw.keyword),
      createdAt: event.created_at.toISOString(),
      lastUpdate: event.updated_at.toISOString(),
      timeline,
      propagationPath,
      keyNodes,
      developmentPhases,
      developmentPattern,
      successFactors,
    };
  }

  async getEventTimeSeries(id: string): Promise<TimeSeriesData> {
    const statistics = await this.queryService.getAllEventStatistics(id);
    const data = await this.analyticsService.getEventTimeSeries(
      id,
      '30d',
      statistics
    );

    return data
  }

  async getEventTrends(id: string): Promise<TrendAnalysis> {
    const statistics = await this.queryService.getAllEventStatistics(id);
    const data = await this.analyticsService.getEventTrends(
      id,
      '30d',
      statistics
    );

    return data;
  }

  async getInfluenceUsers(id: string): Promise<InfluenceUser[]> {
    return await this.queryService.getInfluenceUsers(id);
  }

  async getEventGeographic(id: string): Promise<GeographicDistribution[]> {
    return await this.queryService.getGeographicDistribution(id);
  }

  async getEventKeywords(
    id: string
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    return await this.queryService.getEventKeywords(id);
  }
}
