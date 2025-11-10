import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { OverviewService } from '../services/data/overview.service';
import { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';

@Controller('api/overview')
export class OverviewController implements sdk.OverviewController{
  private overviewService: OverviewService;

  constructor() {
    this.overviewService = root.get(OverviewService);
  }

  @Get('statistics')
  async getStatistics(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getStatistics(validTimeRange);
  }

  @Get('sentiment')
  async getSentiment(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getSentiment(validTimeRange);
  }

  @Get('locations')
  async getLocations(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getLocations(validTimeRange);
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges: TimeRange[] = ['1h', '6h', '12h', '24h', '7d', '30d', '90d', '180d', '365d'];

    return validRanges.includes(timeRange as TimeRange)
      ? (timeRange as TimeRange)
      : '24h';
  }
}