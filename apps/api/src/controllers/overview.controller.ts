import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { OverviewService } from '../services/data/overview.service';
import {
  OverviewStatisticsData,
  OverviewSentiment,
  OverviewLocation,
  TimeRange
} from '../services/data/types';

@Controller('api/overview')
export class OverviewController {
  private overviewService: OverviewService;

  constructor() {
    this.overviewService = root.get(OverviewService);
  }

  @Get('statistics')
  async getStatistics(@Query('timeRange') timeRange?: string): Promise<{
    success: boolean;
    data: OverviewStatisticsData;
    timestamp: string;
  }> {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.overviewService.getStatistics(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: {
          eventCount: 0,
          eventCountChange: 0,
          postCount: 0,
          postCountChange: 0,
          userCount: 0,
          userCountChange: 0,
          interactionCount: 0,
          interactionCountChange: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('sentiment')
  async getSentiment(@Query('timeRange') timeRange?: string): Promise<{
    success: boolean;
    data: OverviewSentiment;
    timestamp: string;
  }> {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.overviewService.getSentiment(validTimeRange);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: {
          positive: { value: 0, change: 0 },
          negative: { value: 0, change: 0 },
          neutral: { value: 0, change: 0 },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('locations')
  async getLocations(@Query('timeRange') timeRange?: string): Promise<{
    success: boolean;
    data: OverviewLocation[];
    timestamp: string;
  }> {
    try {
      const validTimeRange = this.validateTimeRange(timeRange);
      const data = await this.overviewService.getLocations(validTimeRange);
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