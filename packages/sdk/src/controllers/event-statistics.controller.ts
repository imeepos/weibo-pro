import { Controller, Get, Post, Query, Body } from '@sker/core'

export interface StatisticsResult {
  id: string
  event_id: string
  post_count: number
  user_count: number
  comment_count: number
  repost_count: number
  like_count: number
  sentiment: { positive: number; negative: number; neutral: number }
  hotness: number
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  snapshot_at: Date
  trend_metrics: null
  created_at: Date
}

export interface BackfillRequest {
  eventId: string
  startDate: string
  endDate: string
  granularity?: 'hourly' | 'daily'
}

export interface TriggerGenerationRequest {
  snapshotTime?: string
}

@Controller('event-statistics')
export class EventStatisticsController {
  /**
   * 手动触发小时级统计生成
   * @deprecated 小时级统计由订阅器自动生成，无需手动触发
   */
  @Post('generate/hourly')
  triggerHourlyGeneration(@Body() body: TriggerGenerationRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method triggerHourlyGeneration not implements')
  }

  /**
   * 手动触发天级统计生成
   * @deprecated 日级统计通过查询API按需聚合，无需手动生成
   */
  @Post('generate/daily')
  triggerDailyGeneration(@Body() body: TriggerGenerationRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method triggerDailyGeneration not implements')
  }

  /**
   * 回填历史数据
   * @deprecated 历史数据回填已废弃，小时级统计由订阅器自动生成
   */
  @Post('backfill')
  backfillHistoricalData(@Body() body: BackfillRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method backfillHistoricalData not implements')
  }

  /**
   * 查询事件统计数据
   * 数据来源：event_hourly_statistics 表
   * 支持多粒度聚合：hourly(直接查询)、daily(按天聚合)、weekly(按周聚合)、monthly(按月聚合)
   */
  @Get('query')
  queryStatistics(
    @Query('eventId') eventId: string,
    @Query('granularity') granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string
  ): Promise<StatisticsResult[]> {
    throw new Error('method queryStatistics not implements')
  }
}
