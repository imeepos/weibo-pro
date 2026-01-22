import { Controller, Get, Patch, Query, Body } from '@sker/core';
import { root, Inject } from '@sker/core';
import { EventsService } from '../services/data/events.service';
import * as sdk from '@sker/sdk';
import { validateTimeRange } from '../utils/validators';
import { toInt, toFloat } from '../utils/type-converter';

@Controller(sdk.EventsController)
export class EventsController implements sdk.EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = root.get(EventsService);
  }

  async getEventList(
    @Query('timeRange') timeRange?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lambda') lambda?: string
  ) {
    const validTimeRange = timeRange ? validateTimeRange(timeRange) : undefined;
    const pageNum = toInt(page, 1);
    const pageSizeNum = toInt(pageSize, 10);
    const lambdaNum = lambda ? toFloat(lambda) : undefined;

    return this.eventsService.getEventList(validTimeRange, {
      page: pageNum,
      pageSize: pageSizeNum,
      search,
      category: category && category !== 'all' ? category : undefined,
      lambda: lambdaNum
    });
  }

  async getEventCategories(@Query('timeRange') timeRange?: string) {
    const validTimeRange = validateTimeRange(timeRange);
    return this.eventsService.getEventCategories(validTimeRange);
  }

  async getTrendData(@Query('timeRange') timeRange?: string) {
    const validTimeRange = validateTimeRange(timeRange);
    return this.eventsService.getTrendData(validTimeRange);
  }

  async getHotList(@Query('timeRange') timeRange?: string) {
    const validTimeRange = validateTimeRange(timeRange);
    return this.eventsService.getHotList(validTimeRange);
  }

  async getEventTimeSeries(@Query('id') id: string) {
    return this.eventsService.getEventTimeSeries(id);
  }

  async getEventTrends(@Query('id') id: string) {
    return this.eventsService.getEventTrends(id);
  }

  async getInfluenceUsers(@Query('id') id: string) {
    return this.eventsService.getInfluenceUsers(id);
  }

  async getEventGeographic(@Query('id') id: string) {
    return this.eventsService.getEventGeographic(id);
  }

  async getEventKeywords(id: string, limit?: string) {
    const limitNum = toInt(limit, 1000);
    return this.eventsService.getEventKeywords(id, limitNum);
  }

  async getEventDetail(@Query('id') id: string) {
    return this.eventsService.getEventDetail(id);
  }

  // 新增：NLP 深度分析接口

  async getSentimentHotness(@Query('id') id: string) {
    return this.eventsService.getSentimentHotness(id);
  }

  async getSentimentDistribution(@Query('id') id: string) {
    return this.eventsService.getSentimentDistribution(id);
  }

  async getSentimentIntensity(@Query('id') id: string) {
    return this.eventsService.getSentimentIntensity(id);
  }

  async getKeywordsTimeSeries(@Query('id') id: string, @Query('topN') topN?: string) {
    const topNNum = toInt(topN, 20);
    return this.eventsService.getKeywordsTimeSeries(id, topNNum);
  }

  async getKeywordsBySentiment(@Query('id') id: string) {
    return this.eventsService.getKeywordsBySentiment(id);
  }

  async getNegativeKeywords(@Query('id') id: string, @Query('threshold') threshold?: string) {
    const thresholdNum = toFloat(threshold, 0.5);
    return this.eventsService.getNegativeKeywords(id, thresholdNum);
  }

  async getEventTypes(@Query('id') id: string) {
    return this.eventsService.getEventTypes(id);
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标接口

  async getEngagementTrend(@Query('id') id: string) {
    return this.eventsService.getEngagementTrend(id);
  }

  async getAnomalies(@Query('id') id: string) {
    return this.eventsService.getAnomalies(id);
  }

  async getPeaks(@Query('id') id: string, @Query('limit') limit?: string) {
    const limitNum = toInt(limit, 168);
    return this.eventsService.getPeaks(id, limitNum);
  }

  async getEventUserRelations(@Query('id') id: string) {
    return this.eventsService.getEventUserRelations(id);
  }

  async updateEventKeywords(@Query('id') id: string, @Body() body: { keywords: string[] }) {
    return this.eventsService.updateEventKeywords(id, body.keywords);
  }

  async updateEventOccurredAt(@Query('id') id: string, @Body() body: { occurredAt: string | null }) {
    return this.eventsService.updateEventOccurredAt(id, body.occurredAt);
  }

  async refreshCache(@Query('id') id: string) {
    return this.eventsService.refreshCache(id);
  }
}