import { Controller, Get, Query, Param } from '@nestjs/common';
import { root } from '@sker/core';
import { EventsService } from '../services/data/events.service';
import { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';

@Controller('api/events')
export class EventsController implements sdk.EventsController{
  private eventsService: EventsService;

  constructor() {
    this.eventsService = root.get(EventsService);
  }

  @Get('list')
  async getEventList(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getEventList(validTimeRange);
  }

  @Get('categories')
  async getEventCategories(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getEventCategories(validTimeRange);
  }

  @Get('trend-data')
  async getTrendData(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getTrendData(validTimeRange);
  }

  @Get('hot-list')
  async getHotList(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getHotList(validTimeRange);
  }

  @Get(':id')
  async getEventDetail(@Param('id') id: string) {
    return this.eventsService.getEventDetail(id);
  }

  @Get(':id/timeseries')
  async getEventTimeSeries(@Param('id') id: string, @Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getEventTimeSeries(id, validTimeRange);
  }

  @Get(':id/trends')
  async getEventTrends(@Param('id') id: string, @Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.eventsService.getEventTrends(id, validTimeRange);
  }

  @Get(':id/influence-users')
  async getInfluenceUsers(@Param('id') id: string) {
    return this.eventsService.getInfluenceUsers(id);
  }

  @Get(':id/geographic')
  async getEventGeographic(@Param('id') id: string) {
    return this.eventsService.getEventGeographic(id);
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges: TimeRange[] = ['1h', '6h', '12h', '24h', '7d', '30d', '90d', '180d', '365d'];

    return validRanges.includes(timeRange as TimeRange)
      ? (timeRange as TimeRange)
      : '24h';
  }
}