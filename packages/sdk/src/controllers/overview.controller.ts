import { Controller, Get, Query, ApiDescription } from '@sker/core'
import type { TimeRange } from '@sker/entities';
import type {
  OverviewStatisticsData,
  OverviewSentiment,
  OverviewLocation
} from '../types'

@Controller('overview')
export class OverviewController {

  @Get('statistics')
  @ApiDescription(``, ["overview"])
  getStatistics(@Query('timeRange') timeRange?: TimeRange): Promise<OverviewStatisticsData> {
    throw new Error('method getStatistics not implements')
  }

  @Get('sentiment')
  getSentiment(@Query('timeRange') timeRange?: TimeRange): Promise<OverviewSentiment> {
    throw new Error('method getSentiment not implements')
  }

  @Get('locations')
  getLocations(@Query('timeRange') timeRange?: TimeRange): Promise<OverviewLocation[]> {
    throw new Error('method getLocations not implements')
  }
}