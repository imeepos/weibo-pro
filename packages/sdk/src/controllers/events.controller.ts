import { Controller, Get, Query, Param } from '@sker/core'
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
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lambda') lambda?: number
  ): Promise<PaginatedResponse<EventListItem>> {
    console.log({timeRange, page, pageSize, search, category, lambda})
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

  @Get(':id/timeseries')
  getEventTimeSeries(@Param('id') id: string): Promise<TimeSeriesData> {
    throw new Error('method getEventTimeSeries not implements')
  }

  @Get(':id/trends')
  getEventTrends(@Param('id') id: string): Promise<TrendAnalysis> {
    throw new Error('method getEventTrends not implements')
  }

  @Get(':id/influence-users')
  getInfluenceUsers(@Param('id') id: string): Promise<InfluenceUser[]> {
    throw new Error('method getInfluenceUsers not implements')
  }

  @Get(':id/geographic')
  getEventGeographic(@Param('id') id: string): Promise<GeographicDistribution[]> {
    throw new Error('method getEventGeographic not implements')
  }

  @Get(':id/keywords')
  getEventKeywords(@Param('id') id: string, @Query('limit') limit?: number): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    throw new Error('method getEventKeywords not implements')
  }

  @Get(':id')
  getEventDetail(@Param('id') id: string): Promise<EventDetail> {
    throw new Error('method getEventDetail not implements')
  }

  // 新增：NLP 深度分析接口

  @Get(':id/sentiment-hotness')
  getSentimentHotness(@Param('id') id: string): Promise<EventSentimentHotness[]> {
    throw new Error('method getSentimentHotness not implements')
  }

  @Get(':id/sentiment-distribution')
  getSentimentDistribution(@Param('id') id: string): Promise<EventSentimentDistribution> {
    throw new Error('method getSentimentDistribution not implements')
  }

  @Get(':id/sentiment-intensity')
  getSentimentIntensity(@Param('id') id: string): Promise<EventSentimentIntensity[]> {
    throw new Error('method getSentimentIntensity not implements')
  }

  @Get(':id/keywords-timeseries')
  getKeywordsTimeSeries(@Param('id') id: string, @Query('topN') topN?: number): Promise<EventKeywordTimeSeries[]> {
    throw new Error('method getKeywordsTimeSeries not implements')
  }

  @Get(':id/keywords-by-sentiment')
  getKeywordsBySentiment(@Param('id') id: string): Promise<EventKeywordBySentiment[]> {
    throw new Error('method getKeywordsBySentiment not implements')
  }

  @Get(':id/negative-keywords')
  getNegativeKeywords(@Param('id') id: string, @Query('threshold') threshold?: number): Promise<EventNegativeKeywordAlert[]> {
    throw new Error('method getNegativeKeywords not implements')
  }

  @Get(':id/event-types')
  getEventTypes(@Param('id') id: string): Promise<EventEventTypeDistribution[]> {
    throw new Error('method getEventTypes not implements')
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标接口

  @Get(':id/engagement-trend')
  getEngagementTrend(@Param('id') id: string, @Query('limit') limit?: number): Promise<EventEngagementTrend[]> {
    throw new Error('method getEngagementTrend not implements')
  }

  @Get(':id/anomalies')
  getAnomalies(@Param('id') id: string, @Query('limit') limit?: number): Promise<EventAnomaly[]> {
    throw new Error('method getAnomalies not implements')
  }

  @Get(':id/peaks')
  getPeaks(@Param('id') id: string, @Query('limit') limit?: number): Promise<EventPeak[]> {
    throw new Error('method getPeaks not implements')
  }

  @Get(':id/user-relations')
  getEventUserRelations(@Param('id') id: string): Promise<UserRelationNetwork> {
    throw new Error('method getEventUserRelations not implements')
  }
}