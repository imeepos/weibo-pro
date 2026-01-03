import { Controller, Post, Get, Query, Body, Inject } from '@sker/core'
import * as sdk from '@sker/sdk'
import { EventStatisticsService, EventStatisticsEntity, EventEntity, useEntityManager, EventStatisticsQueries } from '@sker/entities'
import { logger } from '@sker/core'

@Controller(sdk.EventStatisticsController)
export class EventStatisticsController implements sdk.EventStatisticsController {
  constructor(
    @Inject(EventStatisticsService) private statisticsService: EventStatisticsService
  ) {}

  /**
   * 手动触发小时级统计生成
   */
  async triggerHourlyGeneration(
    body: sdk.TriggerGenerationRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const snapshotTime = body.snapshotTime ? new Date(body.snapshotTime) : new Date()

      logger.info(`Manually triggering hourly statistics generation at ${snapshotTime.toISOString()}`)

      await this.statisticsService.generateHourlyStatisticsForAllEvents(snapshotTime)

      return {
        success: true,
        message: `Hourly statistics generated successfully for ${snapshotTime.toISOString()}`,
      }
    } catch (error) {
      logger.error('Failed to trigger hourly generation:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 手动触发天级统计生成
   */
  async triggerDailyGeneration(
    body: sdk.TriggerGenerationRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const targetDate = body.snapshotTime ? new Date(body.snapshotTime) : new Date()
      targetDate.setHours(0, 0, 0, 0)

      logger.info(`Manually triggering daily statistics generation for ${targetDate.toISOString()}`)

      // 获取所有活跃事件并生成天级统计
      const { useEntityManager, EventEntity } = await import('@sker/entities')
      const activeEvents = await useEntityManager(async manager => {
        return manager.find(EventEntity, { where: { status: 'active' } })
      })

      const results = await Promise.allSettled(
        activeEvents.map(event => this.statisticsService.calculateDailyStatistics(event.id, targetDate))
      )

      const successCount = results.filter(r => r.status === 'fulfilled').length

      return {
        success: true,
        message: `Daily statistics generated for ${successCount}/${activeEvents.length} events`,
      }
    } catch (error) {
      logger.error('Failed to trigger daily generation:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 回填历史数据
   */
  async backfillHistoricalData(
    body: sdk.BackfillRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { eventId, startDate, endDate, granularity = 'hourly' } = body

      logger.info(
        `Starting backfill for event ${eventId} from ${startDate} to ${endDate} (${granularity})`
      )

      await this.statisticsService.backfillHistoricalData(
        eventId,
        new Date(startDate),
        new Date(endDate),
        granularity
      )

      return {
        success: true,
        message: `Historical data backfilled successfully for event ${eventId}`,
      }
    } catch (error) {
      logger.error('Failed to backfill historical data:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 查询事件统计数据
   */
  async queryStatistics(
    eventId: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
    startTime: string,
    endTime: string
  ): Promise<EventStatisticsEntity[]> {
    try {
      const { useEntityManager, EventStatisticsQueries } = await import('@sker/entities')

      return await useEntityManager(async manager => {
        return EventStatisticsQueries.buildHistoricalStatsQuery(
          manager.createQueryBuilder(EventStatisticsEntity, 'stats'),
          eventId,
          granularity,
          new Date(startTime),
          new Date(endTime)
        ).getMany()
      })
    } catch (error) {
      logger.error('Failed to query statistics:', error)
      throw error
    }
  }
}
