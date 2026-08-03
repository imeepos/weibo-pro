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
  EventMilestone,
  EventInstitutionAccount,
  EventTopicOverview,
  EventOpinionCluster,
  EventEmotionMapItem,
  EventUserEmotionInsight,
  EventSentimentTrendDetailedPoint,
  EventAbnormalUser,
  EventUserRiskProfile,
} from './types';
import { EventQueryService } from './event-query.service';
import { EventAnalyticsService } from './event-analytics.service';
import { EventTimelineBuilder } from './event-timeline.builder';
import { EventMilestoneService } from './event-milestone.service';
import { EventInstitutionService } from './event-institution.service';
import { EventOpinionService } from './event-opinion.service';
import { EventSentimentDetailService } from './event-sentiment-detail.service';
import { EventUserRiskService } from './event-user-risk.service';
import { useEntityManager, EventEntity } from '@sker/entities';
import { KOLAnalysisService } from '../kol-analysis.service';
import type { KOLAnalysisResult } from './types';
import { buildEventDetail } from './events.detail';
import { buildEventCacheKeys, EVENT_LIST_CACHE_PATTERN } from './events.cache';

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
    @Inject(KOLAnalysisService) private readonly kolAnalysisService: KOLAnalysisService,
    @Inject(EventMilestoneService)
    private readonly milestoneService: EventMilestoneService,
    @Inject(EventInstitutionService)
    private readonly institutionService: EventInstitutionService,
    @Inject(EventOpinionService)
    private readonly opinionService: EventOpinionService,
    @Inject(EventSentimentDetailService)
    private readonly sentimentDetailService: EventSentimentDetailService,
    @Inject(EventUserRiskService)
    private readonly userRiskService: EventUserRiskService,
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
    return buildEventDetail(this.queryService, this.analyticsService, this.timelineBuilder, id);
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

  async getEngagementTrend(id: string, _limit?: number): Promise<EventEngagementTrend[]> {
    return await this.queryService.getEngagementTrend(id);
  }

  async getAnomalies(id: string, _limit?: number): Promise<EventAnomaly[]> {
    return await this.queryService.getAnomalies(id);
  }

  async getPeaks(id: string, limit?: number): Promise<EventPeak[]> {
    return await this.queryService.getPeaks(id, limit);
  }

  async getEventUserRelations(id: string): Promise<UserRelationNetwork> {
    return await this.queryService.getEventUserRelations(id);
  }

  async getEventMilestones(id: string): Promise<EventMilestone[]> {
    return this.milestoneService.getEventMilestones(id);
  }

  async getEventInstitutions(id: string): Promise<EventInstitutionAccount[]> {
    return this.institutionService.getEventInstitutions(id);
  }

  async getEventTopicOverview(id: string): Promise<EventTopicOverview> {
    const [keywords, keywordSeries] = await Promise.all([
      this.queryService.getEventKeywords(id, 12),
      this.queryService.getKeywordsTimeSeries(id, 8),
    ]);

    return {
      topTopics: keywords.map((item) => ({
        title: item.keyword,
        count: Math.round(item.weight),
        sentiment: item.sentiment,
        trend: 'stable',
      })),
      timeSeries: keywordSeries,
    };
  }

  async getEventOpinionClusters(id: string): Promise<EventOpinionCluster[]> {
    return this.opinionService.getEventOpinionClusters(id);
  }

  async getEventEmotionMap(id: string): Promise<EventEmotionMapItem[]> {
    return this.sentimentDetailService.getEventEmotionMap(id);
  }

  async getEventUserEmotionInsights(id: string): Promise<EventUserEmotionInsight[]> {
    return this.sentimentDetailService.getEventUserEmotionInsights(id);
  }

  async getEventSentimentTrendDetailed(id: string): Promise<EventSentimentTrendDetailedPoint[]> {
    return this.sentimentDetailService.getEventSentimentTrendDetailed(id);
  }

  async getEventRiskProfile(id: string): Promise<EventUserRiskProfile> {
    return this.userRiskService.getEventRiskProfile(id);
  }

  async getEventAbnormalUsers(id: string): Promise<EventAbnormalUser[]> {
    return this.userRiskService.getEventAbnormalUsers(id);
  }

  async updateEventKeywords(id: string, keywords: string[]): Promise<{ success: boolean }> {
    await useEntityManager(async (manager) => {
      const repo = manager.getRepository(EventEntity);
      await repo.update({ id }, { keywords });
    });
    return { success: true };
  }

  async updateEventOccurredAt(id: string, occurredAt: string | null): Promise<{ success: boolean }> {
    await useEntityManager(async (manager) => {
      const repo = manager.getRepository(EventEntity);
      await repo.update({ id }, { occurred_at: occurredAt ? new Date(occurredAt) : null });
    });
    return { success: true };
  }

  async refreshCache(eventId: string): Promise<{ success: boolean; clearedKeys: string[] }> {
    const clearedKeys: string[] = [];

    // 逐个清除详情缓存
    for (const key of buildEventCacheKeys(eventId)) {
      try {
        await this.queryService.clearCacheByPattern(key);
        clearedKeys.push(key);
      } catch (error) {
        // 忽略清除失败的单键错误
        this.logger.warn(`Failed to clear cache key: ${key}`, error);
      }
    }

    // 事件列表缓存按前缀模式清除（覆盖任意分页/搜索组合）
    try {
      await this.queryService.clearCacheByPattern(EVENT_LIST_CACHE_PATTERN);
      clearedKeys.push(EVENT_LIST_CACHE_PATTERN);
    } catch (error) {
      this.logger.warn(`Failed to clear cache pattern: ${EVENT_LIST_CACHE_PATTERN}`, error);
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
