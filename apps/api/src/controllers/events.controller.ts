import { Controller, Get, Query, Param } from '@sker/core';
import { root } from '@sker/core';
import { EventsService } from '../services/data/events.service';
import { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';

@Controller(sdk.EventsController)
export class EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = root.get(EventsService);
  }

  async getEventList(
    @Query('timeRange') timeRange?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('category') category?: string
  ) {
    const validTimeRange = timeRange ? this.validateTimeRange(timeRange) : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;

    return this.eventsService.getEventList(validTimeRange, {
      page: pageNum,
      pageSize: pageSizeNum,
      search,
      category: category && category !== 'all' ? category : undefined
    });
  }

  async getEventCategories(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getEventCategories(validTimeRange);
  }

  async getTrendData(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getTrendData(validTimeRange);
  }

  async getHotList(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getHotList(validTimeRange);
  }

  async getEventTimeSeries(@Param('id') id: string) {
    return this.eventsService.getEventTimeSeries(id);
  }

  async getEventTrends(@Param('id') id: string) {
    return this.eventsService.getEventTrends(id);
  }

  async getInfluenceUsers(@Param('id') id: string) {
    return this.eventsService.getInfluenceUsers(id);
  }

  async getEventGeographic(@Param('id') id: string) {
    return this.eventsService.getEventGeographic(id);
  }

  async getEventKeywords(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 1000;
    return this.eventsService.getEventKeywords(id, limitNum);
  }

  async getEventDetail(@Param('id') id: string) {
    return this.eventsService.getEventDetail(id);
  }

  // 新增：NLP 深度分析接口

  async getSentimentHotness(@Param('id') id: string) {
    return this.eventsService.getSentimentHotness(id);
  }

  async getSentimentDistribution(@Param('id') id: string) {
    return this.eventsService.getSentimentDistribution(id);
  }

  async getSentimentIntensity(@Param('id') id: string) {
    return this.eventsService.getSentimentIntensity(id);
  }

  async getKeywordsTimeSeries(@Param('id') id: string, @Query('topN') topN?: string) {
    const topNNum = topN ? parseInt(topN, 10) : 20;
    return this.eventsService.getKeywordsTimeSeries(id, topNNum);
  }

  async getKeywordsBySentiment(@Param('id') id: string) {
    return this.eventsService.getKeywordsBySentiment(id);
  }

  async getNegativeKeywords(@Param('id') id: string, @Query('threshold') threshold?: string) {
    const thresholdNum = threshold ? parseFloat(threshold) : 0.5;
    return this.eventsService.getNegativeKeywords(id, thresholdNum);
  }

  async getEventTypes(@Param('id') id: string) {
    return this.eventsService.getEventTypes(id);
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标接口

  async getEngagementTrend(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 168;
    return this.eventsService.getEngagementTrend(id, limitNum);
  }

  async getAnomalies(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 168;
    return this.eventsService.getAnomalies(id, limitNum);
  }

  async getPeaks(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 168;
    return this.eventsService.getPeaks(id, limitNum);
  }

  async getEventUserRelations(@Param('id') id: string) {
    return this.eventsService.getEventUserRelations(id);
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges: TimeRange[] = ['all', '1h', '6h', '12h', '24h', '7d', '30d', '90d', '180d', '365d'];

    return validRanges.includes(timeRange as TimeRange)
      ? (timeRange as TimeRange)
      : '24h';
  }
}