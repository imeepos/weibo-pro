import { Controller, Get, Post, Query, Body } from '@sker/core'
import type { EventStatisticsEntity } from '@sker/entities'

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
   */
  @Post('generate/hourly')
  triggerHourlyGeneration(@Body() body: TriggerGenerationRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method triggerHourlyGeneration not implements')
  }

  /**
   * 手动触发天级统计生成
   */
  @Post('generate/daily')
  triggerDailyGeneration(@Body() body: TriggerGenerationRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method triggerDailyGeneration not implements')
  }

  /**
   * 回填历史数据
   */
  @Post('backfill')
  backfillHistoricalData(@Body() body: BackfillRequest): Promise<{ success: boolean; message: string }> {
    throw new Error('method backfillHistoricalData not implements')
  }

  /**
   * 查询事件统计数据
   */
  @Get('query')
  queryStatistics(
    @Query('eventId') eventId: string,
    @Query('granularity') granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string
  ): Promise<EventStatisticsEntity[]> {
    throw new Error('method queryStatistics not implements')
  }
}
