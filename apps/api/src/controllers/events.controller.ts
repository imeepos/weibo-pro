import { Controller, Get, Query, Param } from '@nestjs/common';
import { root } from '@sker/core';
import { EventsService } from '../services/data/events.service';
import { HotEvent, TimeRange } from '../services/data/types';

@Controller('api/events')
export class EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = root.get(EventsService);
  }

  @Get('list')
  async getEventList(@Query('timeRange') timeRange?: string) {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getEventList(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('categories')
  async getEventCategories(@Query('timeRange') timeRange?: string) {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getEventCategories(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('trend-data')
  async getTrendData(@Query('timeRange') timeRange?: string) {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getTrendData(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('hot-list')
  async getHotList(@Query('timeRange') timeRange?: string): Promise<{
    success: boolean;
    data: HotEvent[];
    timestamp: string;
  }> {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getHotList(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get(':id')
  async getEventDetail(@Param('id') id: string) {
    try {
      const data = await this.eventsService.getEventDetail(id);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get(':id/timeseries')
  async getEventTimeSeries(@Param('id') id: string, @Query('timeRange') timeRange?: string) {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getEventTimeSeries(id, validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get(':id/trends')
  async getEventTrends(@Param('id') id: string, @Query('timeRange') timeRange?: string) {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.eventsService.getEventTrends(id, validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get(':id/influence-users')
  async getInfluenceUsers(@Param('id') id: string) {
    try {
      const data = await this.eventsService.getInfluenceUsers(id);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get(':id/geographic')
  async getEventGeographic(@Param('id') id: string) {
    try {
      const data = await this.eventsService.getEventGeographic(id);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges: TimeRange[] = [
      'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth',
      'thisQuarter', 'lastQuarter', 'halfYear', 'lastHalfYear', 'thisYear', 'lastYear', 'all'
    ];

    return validRanges.includes(timeRange as TimeRange)
      ? (timeRange as TimeRange)
      : 'today';
  }
}