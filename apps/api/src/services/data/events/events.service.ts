import { Injectable, Inject } from '@sker/core';
import { createLogger } from '@sker/core';
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
  GeographicResponse,
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
import { KOLAnalysisService } from '../kol-analysis.service';
import type { KOLAnalysisResult } from './types';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly logger = createLogger('EventsService');

  constructor(
    @Inject(EventQueryService)
    private readonly queryService: EventQueryService,
    @Inject(EventAnalyticsService)
    private readonly analyticsService: EventAnalyticsService,
    @Inject(EventTimelineBuilder)
    private readonly timelineBuilder: EventTimelineBuilder,
    @Inject(DataSource) private dataSource: DataSource,
    @Inject(KOLAnalysisService) private readonly kolAnalysisService: KOLAnalysisService
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
      keywords: keywordsData.map((kw) => String(kw.keyword)).filter(k => k && k !== 'undefined' && k !== 'null'),
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

  async getEventGeographic(id: string): Promise<GeographicResponse> {
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
    return await this.queryService.getEngagementTrend(id);
  }

  async getAnomalies(id: string, limit?: number): Promise<EventAnomaly[]> {
    return await this.queryService.getAnomalies(id);
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

  async refreshCache(eventId: string): Promise<{ success: boolean; clearedKeys: string[] }> {
    // 获取所有与该事件相关的缓存键
    const cacheKeys = [
      // 事件详情相关缓存
      `events:detail:${eventId}`,
      `event:timeseries:${eventId}`,
      `event:trend:${eventId}`,
      `event:influence_users:${eventId}`,
      `event:geographic:${eventId}`,
      `event:keywords:${eventId}`,
      `event:sentiment_hotness:${eventId}`,
      `event:sentiment_distribution:${eventId}`,
      `event:keywords_timeseries:${eventId}`,
      `event:keywords_by_sentiment:${eventId}`,
      `event:negative_keywords:${eventId}`,
      `event:event_types:${eventId}`,
      `event:engagement_trend:${eventId}`,
      `event:anomalies:${eventId}`,
      `event:peaks:${eventId}`,
      `event:user-relations:${eventId}`,
      // 事件列表缓存（需要清除所有可能的列表缓存）
      `events:detail:list:all:1:10::::0.05`,
      `events:detail:list:all:1:10:::all::0.05`,
      `events:detail:list:24h:1:10::::0.05`,
      `events:detail:list:24h:1:10:::all::0.05`,
      `events:detail:list:7d:1:10::::0.05`,
      `events:detail:list:7d:1:10:::all::0.05`,
      `events:detail:list:30d:1:10::::0.05`,
      `events:detail:list:30d:1:10:::all::0.05`,
      // 更多可能的列表缓存组合
      `events:detail:list:all:1:10::test::0.05`,
      `events:detail:list:24h:1:10::test::0.05`,
      `events:detail:list:7d:1:10::test::0.05`,
      `events:detail:list:30d:1:10::test::0.05`,
      `events:detail:list:all:1:20::::0.05`,
      `events:detail:list:24h:1:20::::0.05`,
      `events:detail:list:7d:1:20::::0.05`,
      `events:detail:list:30d:1:20::::0.05`,
      `events:detail:list:all:1:20:::all::0.05`,
      `events:detail:list:24h:1:20:::all::0.05`,
      `events:detail:list:7d:1:20:::all::0.05`,
      `events:detail:list:30d:1:20:::all::0.05`
    ];

    const clearedKeys: string[] = [];

    // 逐个清除缓存
    for (const key of cacheKeys) {
      try {
        await this.queryService.clearCacheByPattern(key);
        clearedKeys.push(key);
      } catch (error) {
        // 忽略清除失败的单键错误
        this.logger.warn(`Failed to clear cache key: ${key}`, error);
      }
    }

    this.logger.info(`Cache cleared for event ${eventId}, cleared ${clearedKeys.length} keys`);

    return {
      success: true,
      clearedKeys
    };
  }

  async getKOLAnalysis(eventId: string): Promise<KOLAnalysisResult> {
    return this.kolAnalysisService.getKOLAnalysis(eventId);
  }
}
