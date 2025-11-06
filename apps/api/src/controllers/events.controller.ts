import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { EventsService } from '../services/data/events.service';
import { HotEvent, TimeRange } from '../services/data/types';

@Controller('api/events')
export class EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = root.get(EventsService);
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