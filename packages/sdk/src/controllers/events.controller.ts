import { Controller, Get, Post, Patch, Query, Body } from '@sker/core'
import type {
  EventListItem,
  EventCategoryStats,
  TrendDataSeries,
  HotEvent,
  EventDetail,
  InfluenceUser,
  GeographicDistribution,
  TimeSeriesData,
  TrendAnalysis,
  TimeRange,
  PaginatedResponse,
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
  EventHourlySummary,
  MultiMetricTrendData,
  EngagementBreakdown,
  UserRelationNetwork
} from '../types'

@Controller('events')
export class EventsController {

  @Get('list')
  getEventList(
    @Query('timeRange') timeRange?: TimeRange,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lambda') lambda?: string
  ): Promise<PaginatedResponse<EventListItem>> {
    throw new Error('method getEventList not implements')
  }

  @Get('categories')
  getEventCategories(@Query('timeRange') timeRange?: TimeRange): Promise<EventCategoryStats> {
    throw new Error('method getEventCategories not implements')
  }

  @Get('trend-data')
  getTrendData(@Query('timeRange') timeRange?: TimeRange): Promise<TrendDataSeries> {
    throw new Error('method getTrendData not implements')
  }

  @Get('hot-list')
  getHotList(@Query('timeRange') timeRange?: TimeRange): Promise<HotEvent[]> {
    throw new Error('method getHotList not implements')
  }

  @Get('timeseries')
  getEventTimeSeries(@Query('id') id: string): Promise<TimeSeriesData> {
    throw new Error('method getEventTimeSeries not implements')
  }

  @Get('trends')
  getEventTrends(@Query('id') id: string): Promise<TrendAnalysis> {
    throw new Error('method getEventTrends not implements')
  }

  @Get('influence-users')
  getInfluenceUsers(@Query('id') id: string): Promise<InfluenceUser[]> {
    throw new Error('method getInfluenceUsers not implements')
  }

  @Get('geographic')
  getEventGeographic(@Query('id') id: string): Promise<GeographicDistribution[]> {
    throw new Error('method getEventGeographic not implements')
  }

  @Get('getEventKeywords')
  getEventKeywords(@Query('id') id: string, @Query('limit') limit?: string): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    throw new Error('method getEventKeywords not implements')
  }

  @Get('detail')
  getEventDetail(@Query('id') id: string): Promise<EventDetail> {
    throw new Error('method getEventDetail not implements')
  }

  // 新增：NLP 深度分析接口

  @Get('sentiment-hotness')
  getSentimentHotness(@Query('id') id: string): Promise<EventSentimentHotness[]> {
    throw new Error('method getSentimentHotness not implements')
  }

  @Get('sentiment-distribution')
  getSentimentDistribution(@Query('id') id: string): Promise<EventSentimentDistribution> {
    throw new Error('method getSentimentDistribution not implements')
  }

  @Get('sentiment-intensity')
  getSentimentIntensity(@Query('id') id: string): Promise<EventSentimentIntensity[]> {
    throw new Error('method getSentimentIntensity not implements')
  }

  @Get('keywords-timeseries')
  getKeywordsTimeSeries(@Query('id') id: string, @Query('topN') topN?: string): Promise<EventKeywordTimeSeries[]> {
    throw new Error('method getKeywordsTimeSeries not implements')
  }

  @Get('keywords-by-sentiment')
  getKeywordsBySentiment(@Query('id') id: string): Promise<EventKeywordBySentiment[]> {
    throw new Error('method getKeywordsBySentiment not implements')
  }

  @Get('negative-keywords')
  getNegativeKeywords(@Query('id') id: string, @Query('threshold') threshold?: string): Promise<EventNegativeKeywordAlert[]> {
    throw new Error('method getNegativeKeywords not implements')
  }

  @Get('event-types')
  getEventTypes(@Query('id') id: string): Promise<EventEventTypeDistribution[]> {
    throw new Error('method getEventTypes not implements')
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标接口

  @Get('engagement-trend')
  getEngagementTrend(@Query('id') id: string, @Query('limit') limit?: string): Promise<EventEngagementTrend[]> {
    throw new Error('method getEngagementTrend not implements')
  }

  @Get('anomalies')
  getAnomalies(@Query('id') id: string, @Query('limit') limit?: string): Promise<EventAnomaly[]> {
    throw new Error('method getAnomalies not implements')
  }

  @Get('peaks')
  getPeaks(@Query('id') id: string, @Query('limit') limit?: string): Promise<EventPeak[]> {
    throw new Error('method getPeaks not implements')
  }

  @Get('user-relations')
  getEventUserRelations(@Query('id') id: string): Promise<UserRelationNetwork> {
    throw new Error('method getEventUserRelations not implements')
  }

  @Patch('keywords')
  updateEventKeywords(@Query('id') id: string, @Body() body: { keywords: string[] }): Promise<{ success: boolean }> {
    throw new Error('method updateEventKeywords not implements')
  }

  @Patch('occurred-at')
  updateEventOccurredAt(@Query('id') id: string, @Body() body: { occurredAt: string | null }): Promise<{ success: boolean }> {
    throw new Error('method updateEventOccurredAt not implements')
  }

  @Post('cache/refresh')
  refreshCache(@Query('id') id: string): Promise<{ success: boolean; clearedKeys: string[] }> {
    throw new Error('method refreshCache not implements')
  }
}