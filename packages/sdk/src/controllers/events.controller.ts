import { Controller, Get, Query, Param } from '@sker/core'
import type { TimeRange } from '@sker/entities';

@Controller('api/events')
export class EventsController {

  @Get('list')
  getEventList(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getEventList not implements')
  }

  @Get('categories')
  getEventCategories(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getEventCategories not implements')
  }

  @Get('trend-data')
  getTrendData(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getTrendData not implements')
  }

  @Get('hot-list')
  getHotList(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getHotList not implements')
  }

  @Get(':id')
  getEventDetail(@Param('id') id: string): Promise<any> {
    throw new Error('method getEventDetail not implements')
  }

  @Get(':id/timeseries')
  getEventTimeSeries(@Param('id') id: string, @Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getEventTimeSeries not implements')
  }

  @Get(':id/trends')
  getEventTrends(@Param('id') id: string, @Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getEventTrends not implements')
  }

  @Get(':id/influence-users')
  getInfluenceUsers(@Param('id') id: string): Promise<any> {
    throw new Error('method getInfluenceUsers not implements')
  }

  @Get(':id/geographic')
  getEventGeographic(@Param('id') id: string): Promise<any> {
    throw new Error('method getEventGeographic not implements')
  }
}