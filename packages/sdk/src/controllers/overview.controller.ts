import { Controller, Get, Query } from '@sker/core'
import type { TimeRange } from '@sker/entities';

@Controller('api/overview')
export class OverviewController {

  @Get('statistics')
  getStatistics(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getStatistics not implements')
  }

  @Get('sentiment')
  getSentiment(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getSentiment not implements')
  }

  @Get('locations')
  getLocations(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getLocations not implements')
  }
}