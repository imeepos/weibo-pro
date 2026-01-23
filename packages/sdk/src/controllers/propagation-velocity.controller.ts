import { Controller, Get, Query } from '@sker/core'

/**
 * 传播速度指数接口
 */
export interface PropagationVelocity {
  viralCoefficient: number      // 病毒系数 = 平均每个帖子带来的转发数
  hourlyGrowthRates: number[]    // 每小时增长率数组
  peakVelocity: number          // 峰值速度 = 最大小时增长率
  accelerationPhase: 'accelerating' | 'decelerating' | 'stable'  // 加速阶段
  eventId: string               // 事件ID
  calculatedAt: string          // 计算时间（ISO 8601格式）
}

/**
 * 传播速度查询参数
 */
export interface PropagationVelocityQuery {
  eventId: string               // 事件ID
  startTime?: string            // 开始时间（ISO 8601格式）
  endTime?: string              // 结束时间（ISO 8601格式）
}

/**
 * 传播速度指数控制器
 *
 * API 路径：/api/events/:eventId/propagation/velocity
 */
@Controller('events/:eventId/propagation')
export class PropagationVelocityController {
  /**
   * 获取事件的传播速度指数
   *
   * GET /api/events/:eventId/propagation/velocity
   *
   * @param eventId 事件ID
   * @param startTime 开始时间（可选）
   * @param endTime 结束时间（可选）
   * @returns 传播速度指数数据
   *
   * @example
   * GET /api/events/abc123/propagation/velocity?startTime=2026-01-01T00:00:00Z&endTime=2026-01-02T00:00:00Z
   */
  @Get('velocity')
  getVelocity(
    @Query('eventId') eventId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string
  ): Promise<PropagationVelocity | null> {
    throw new Error('method getVelocity not implements')
  }
}
