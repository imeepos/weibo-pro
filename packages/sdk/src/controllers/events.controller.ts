import { Controller, Get, Query, Param } from '@sker/core'
import type {
  EventListItem,
  EventCategoryStats,
  TrendDataSeries,
  HotEvent,
  EventDetail,
  InfluenceUser,
  GeographicDistribution,
  TimeSeriesData,
  TrendAnalysis,
  TimeRange
} from '../types'

@Controller('api/events')
export class EventsController {

  @Get('list')
  getEventList(@Query('timeRange') timeRange?: TimeRange): Promise<EventListItem[]> {
    throw new Error('method getEventList not implements')
  }

  @Get('categories')
  getEventCategories(@Query('timeRange') timeRange?: TimeRange): Promise<EventCategoryStats> {
    throw new Error('method getEventCategories not implements')
  }

  @Get('trend-data')
  getTrendData(@Query('timeRange') timeRange?: TimeRange): Promise<TrendDataSeries> {
    throw new Error('method getTrendData not implements')
  }

  @Get('hot-list')
  getHotList(@Query('timeRange') timeRange?: TimeRange): Promise<HotEvent[]> {
    throw new Error('method getHotList not implements')
  }

  @Get(':id/timeseries')
  getEventTimeSeries(@Param('id') id: string): Promise<TimeSeriesData> {
    throw new Error('method getEventTimeSeries not implements')
  }

  @Get(':id/trends')
  getEventTrends(@Param('id') id: string): Promise<TrendAnalysis> {
    throw new Error('method getEventTrends not implements')
  }

  @Get(':id/influence-users')
  getInfluenceUsers(@Param('id') id: string): Promise<InfluenceUser[]> {
    throw new Error('method getInfluenceUsers not implements')
  }

  @Get(':id/geographic')
  getEventGeographic(@Param('id') id: string): Promise<GeographicDistribution[]> {
    throw new Error('method getEventGeographic not implements')
  }

  @Get(':id/keywords')
  getEventKeywords(@Param('id') id: string): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    throw new Error('method getEventKeywords not implements')
  }

  @Get(':id')
  getEventDetail(@Param('id') id: string): Promise<EventDetail> {
    throw new Error('method getEventDetail not implements')
  }
}