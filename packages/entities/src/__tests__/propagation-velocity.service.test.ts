import { describe, it, expect } from 'vitest'
import { PropagationVelocityService } from '../services/propagation-velocity.service'

/**
 * TDD Phase 1: RED - 编写失败的测试用例
 *
 * 测试传播速度计算逻辑
 * 1. 病毒系数计算 (viralCoefficient)
 * 2. 小时增长率计算 (hourlyGrowthRate)
 * 3. 加速阶段判断 (accelerationPhase)
 * 4. 峰值速度 (peakVelocity)
 */

describe('PropagationVelocityService - 病毒系数计算', () => {
  it('应该正确计算病毒系数（转发数/帖子数）', async () => {
    // 准备测试数据
    const mockStatistics = [
      { post_count: 100, repost_count: 500, year: 2026, month: 1, day: 23, hour: 10 },
      { post_count: 150, repost_count: 750, year: 2026, month: 1, day: 23, hour: 11 },
    ]

    // 期望结果：病毒系数 = 总转发数 / 总帖子数 = (500 + 750) / (100 + 150) = 1250 / 250 = 5.0
    const expectedViralCoefficient = 5.0

    // 这里会失败，因为 PropagationVelocityService 还不存在
    const service = new PropagationVelocityService()
    const result = await service.calculateViralCoefficient(mockStatistics)

    expect(result.viralCoefficient).toBe(expectedViralCoefficient)
  })

  it('当没有帖子时，病毒系数应该为 0', async () => {
    const mockStatistics = [
      { post_count: 0, repost_count: 0, year: 2026, month: 1, day: 23, hour: 10 },
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateViralCoefficient(mockStatistics)

    expect(result.viralCoefficient).toBe(0)
  })

  it('当只有帖子没有转发时，病毒系数应该为 0', async () => {
    const mockStatistics = [
      { post_count: 100, repost_count: 0, year: 2026, month: 1, day: 23, hour: 10 },
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateViralCoefficient(mockStatistics)

    expect(result.viralCoefficient).toBe(0)
  })
})

describe('PropagationVelocityService - 小时增长率计算', () => {
  it('应该正确计算小时增长率', async () => {
    const mockStatistics = [
      { post_count: 100, year: 2026, month: 1, day: 23, hour: 10 },
      { post_count: 150, year: 2026, month: 1, day: 23, hour: 11 }, // 增长 50%
      { post_count: 180, year: 2026, month: 1, day: 23, hour: 12 }, // 增长 20%
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateHourlyGrowthRates(mockStatistics)

    // 第一个小时没有增长率（没有上一小时数据）
    expect(result.hourlyGrowthRates[0]).toBeUndefined()

    // 第二小时增长率 = (150 - 100) / 100 * 100 = 50%
    expect(result.hourlyGrowthRates[1]).toBe(50)

    // 第三小时增长率 = (180 - 150) / 150 * 100 = 20%
    expect(result.hourlyGrowthRates[2]).toBe(20)
  })

  it('应该找到峰值速度', async () => {
    const mockStatistics = [
      { post_count: 100, year: 2026, month: 1, day: 23, hour: 10 },
      { post_count: 150, year: 2026, month: 1, day: 23, hour: 11 }, // 50%
      { post_count: 200, year: 2026, month: 1, day: 23, hour: 12 }, // 33.33%
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateHourlyGrowthRates(mockStatistics)

    // 峰值速度应该是 50%
    expect(result.peakVelocity).toBe(50)
  })

  it('当只有一个小时数据时，峰值速度应该为 0', async () => {
    const mockStatistics = [
      { post_count: 100, year: 2026, month: 1, day: 23, hour: 10 },
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateHourlyGrowthRates(mockStatistics)

    expect(result.peakVelocity).toBe(0)
  })

  it('应该处理上一小时帖子数为 0 的情况', async () => {
    const mockStatistics = [
      { post_count: 0, year: 2026, month: 1, day: 23, hour: 10 },
      { post_count: 100, year: 2026, month: 1, day: 23, hour: 11 },
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculateHourlyGrowthRates(mockStatistics)

    // 从 0 到 100 应该视为 100% 增长
    expect(result.hourlyGrowthRates[1]).toBe(100)
  })
})

describe('PropagationVelocityService - 加速阶段判断', () => {
  it('应该判断为加速阶段（增长率连续上升）', async () => {
    const hourlyGrowthRates = [undefined, 10, 20, 30, 40]

    const service = new PropagationVelocityService()
    const phase = service.determineAccelerationPhase(hourlyGrowthRates)

    expect(phase).toBe('accelerating')
  })

  it('应该判断为减速阶段（增长率连续下降）', async () => {
    const hourlyGrowthRates = [undefined, 40, 30, 20, 10]

    const service = new PropagationVelocityService()
    const phase = service.determineAccelerationPhase(hourlyGrowthRates)

    expect(phase).toBe('decelerating')
  })

  it('应该判断为稳定阶段（增长率波动较小）', async () => {
    const hourlyGrowthRates = [undefined, 20, 21, 19, 20, 20]

    const service = new PropagationVelocityService()
    const phase = service.determineAccelerationPhase(hourlyGrowthRates)

    expect(phase).toBe('stable')
  })

  it('当数据不足时应该判断为稳定', async () => {
    const hourlyGrowthRates = [undefined, 10]

    const service = new PropagationVelocityService()
    const phase = service.determineAccelerationPhase(hourlyGrowthRates)

    expect(phase).toBe('stable')
  })
})

describe('PropagationVelocityService - 完整计算流程', () => {
  it('应该正确计算完整的传播速度指数', async () => {
    const mockStatistics = [
      { post_count: 100, repost_count: 500, year: 2026, month: 1, day: 23, hour: 10 },
      { post_count: 150, repost_count: 750, year: 2026, month: 1, day: 23, hour: 11 },
      { post_count: 180, repost_count: 900, year: 2026, month: 1, day: 23, hour: 12 },
      { post_count: 200, repost_count: 1000, year: 2026, month: 1, day: 23, hour: 13 },
    ]

    const service = new PropagationVelocityService()
    const result = await service.calculatePropagationVelocity('test-event-id', mockStatistics)

    // 验证病毒系数
    expect(result.viralCoefficient).toBeCloseTo(5.0, 1) // (500+750+900+1000) / (100+150+180+200) = 3150 / 630 = 5.0

    // 验证峰值速度
    expect(result.peakVelocity).toBeGreaterThan(0)

    // 验证加速阶段
    expect(['accelerating', 'decelerating', 'stable']).toContain(result.accelerationPhase)

    // 验证小时增长率数组
    expect(result.hourlyGrowthRates).toBeDefined()
    expect(result.hourlyGrowthRates.length).toBe(4)
  })
})
