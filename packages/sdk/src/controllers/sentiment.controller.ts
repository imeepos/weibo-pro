import { Controller, Get, Post, Query, Body } from '@sker/core'
import type { TimeRange } from '@sker/entities';

@Controller('api/sentiment')
export class SentimentController {

  @Get('realtime')
  getRealtimeData(@Query('timeRange') timeRange: TimeRange = '12h'): Promise<any> {
    throw new Error('method getRealtimeData not implements')
  }

  @Get('statistics')
  getStatistics(@Query('timeRange') timeRange: TimeRange = '12h'): Promise<any> {
    throw new Error('method getStatistics not implements')
  }

  @Get('hot-topics')
  getHotTopics(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getHotTopics not implements')
  }

  @Get('keywords')
  getKeywords(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getKeywords not implements')
  }

  @Get('time-series')
  getTimeSeries(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getTimeSeries not implements')
  }

  @Get('locations')
  getLocations(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getLocations not implements')
  }

  @Get('recent-posts')
  getRecentPosts(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getRecentPosts not implements')
  }

  @Post('search')
  search(@Body() searchData: { keyword: string; timeRange?: TimeRange }): Promise<any> {
    throw new Error('method search not implements')
  }
}