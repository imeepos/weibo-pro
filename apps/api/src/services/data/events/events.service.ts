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
  ) {}

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

  async getTrendData(timeRange: TimeRange): Promise<{
    success: boolean;
    data: TrendDataSeries;
    message: string;
  }> {
    const data = await this.analyticsService.getTrendData(timeRange);
    return {
      success: true,
      data,
      message: '获取趋势数据成功',
    };
  }

  async getEventDetail(id: string): Promise<{
    success: boolean;
    data: EventDetail | null;
    message: string;
  }> {
    const event = await this.queryService.getEventById(id);

    if (!event) {
      return {
        success: false,
        data: null,
        message: '事件不存在',
      };
    }

    const latestStats = await this.queryService.getLatestStatistics(id);
    const statistics = await this.queryService.getEventStatistics(id, '30d');

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
      success: true,
      data: {
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
        keywords: [],
        createdAt: event.created_at.toISOString(),
        lastUpdate: event.updated_at.toISOString(),
        timeline,
        propagationPath,
        keyNodes,
        developmentPhases,
        developmentPattern,
        successFactors,
      },
      message: '获取事件详情成功',
    };
  }

  async getEventTimeSeries(
    id: string,
    timeRange: TimeRange
  ): Promise<{
    success: boolean;
    data: TimeSeriesData;
    message: string;
  }> {
    const statistics = await this.queryService.getEventStatistics(
      id,
      timeRange
    );
    const data = await this.analyticsService.getEventTimeSeries(
      id,
      timeRange,
      statistics
    );

    return {
      success: true,
      data,
      message: '获取事件时间序列数据成功',
    };
  }

  async getEventTrends(
    id: string,
    timeRange: TimeRange
  ): Promise<{
    success: boolean;
    data: TrendAnalysis;
    message: string;
  }> {
    const statistics = await this.queryService.getEventStatistics(
      id,
      timeRange
    );
    const data = await this.analyticsService.getEventTrends(
      id,
      timeRange,
      statistics
    );

    return {
      success: true,
      data,
      message: '获取事件趋势数据成功',
    };
  }

  async getInfluenceUsers(id: string): Promise<{
    success: boolean;
    data: InfluenceUser[];
    message: string;
  }> {
    const data = await this.queryService.getInfluenceUsers(id);

    return {
      success: true,
      data,
      message: '获取影响力用户数据成功',
    };
  }

  async getEventGeographic(id: string): Promise<{
    success: boolean;
    data: GeographicDistribution[];
    message: string;
  }> {
    const data = await this.queryService.getGeographicDistribution(id);

    return {
      success: true,
      data,
      message: '获取事件地理分布数据成功',
    };
  }
}
