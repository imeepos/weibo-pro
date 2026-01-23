import { Controller, Get, Query } from '@sker/core'

/**
 * 速度时间点
 */
export interface VelocityTimePoint {
  timestamp: string               // 时间戳（ISO 8601格式）
  velocity: number                // 速度（转发/小时）
  acceleration: number            // 加速度（转发/小时²）
  cumulativeReposts: number       // 累计转发数
}

/**
 * 传播速度分析结果
 */
export interface PropagationVelocityAnalysis {
  // 基础指标
  currentVelocity: number         // 当前传播速度（转发/小时）
  peakVelocity: number            // 峰值速度（转发/小时）
  avgVelocity: number             // 平均速度（转发/小时）

  // 加速度分析
  acceleration: number            // 当前加速度（转发/小时²）
  accelerationTrend: 'increasing' | 'stable' | 'decreasing'  // 加速度趋势

  // 时间序列
  velocityTimeline: VelocityTimePoint[]  // 速度时间线

  // 爆发点预测
  predictedBurstTime?: string     // 预测爆发时间（ISO 8601格式）
  burstProbability: number        // 爆发概率 (0-1)

  // 传播阶段
  currentPhase: 'initial' | 'growth' | 'peak' | 'decline' | 'stable'  // 当前阶段
  phaseStartTime: string          // 阶段开始时间（ISO 8601格式）

  // 元数据
  eventId: string                 // 事件ID
  calculatedAt: string            // 计算时间（ISO 8601格式）
}

/**
 * 传播速度查询参数
 */
export interface PropagationVelocityQuery {
  eventId: string                 // 事件ID
  startTime?: string              // 开始时间（ISO 8601格式）
  endTime?: string                // 结束时间（ISO 8601格式）
}

/**
 * 传播速度分析控制器
 *
 * API 路径：/api/events/:eventId/propagation/velocity
 */
@Controller('events/:eventId/propagation')
export class PropagationVelocityController {
  /**
   * 获取事件的传播速度分析
   *
   * GET /api/events/:eventId/propagation/velocity
   *
   * @param eventId 事件ID
   * @param startTime 开始时间（可选）
   * @param endTime 结束时间（可选）
   * @returns 传播速度分析数据
   *
   * @example
   * GET /api/events/abc123/propagation/velocity?startTime=2026-01-01T00:00:00Z&endTime=2026-01-02T00:00:00Z
   */
  @Get('velocity')
  getVelocity(
    @Query('eventId') eventId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string
  ): Promise<PropagationVelocityAnalysis | null> {
    throw new Error('method getVelocity not implements')
  }
}

/**
 * @deprecated 使用 PropagationVelocityAnalysis 替代
 * 旧版传播速度指数接口（保留向后兼容）
 */
export interface PropagationVelocity {
  viralCoefficient: number      // 病毒系数 = 平均每个帖子带来的转发数
  hourlyGrowthRates: number[]    // 每小时增长率数组
  peakVelocity: number          // 峰值速度 = 最大小时增长率
  accelerationPhase: 'accelerating' | 'decelerating' | 'stable'  // 加速阶段
  eventId: string               // 事件ID
  calculatedAt: string          // 计算时间（ISO 8601格式）
}
