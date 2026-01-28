import { describe, it, expect } from 'vitest'
import { HourlyStatisticsHelper } from '@sker/entities'

/**
 * TDD Phase 1: RED - 编写失败的测试用例
 *
 * 测试时区转换逻辑
 * 1. UTC 时间转换为中国时区 (UTC+8) 的时间维度
 * 2. 边界情况测试（跨天、跨月、跨年）
 * 3. 确保时间维度与实际北京时间一致
 */

describe('HourlyStatisticsHelper - 时区转换', () => {
  describe('getTimeDimensions - 基本转换', () => {
    it('应该正确转换北京时间 2026-01-28 00:00:00 (UTC)', () => {
      // 北京时间 2026-01-28 00:00:00 对应 UTC 时间 2026-01-27 16:00:00
      const utcDate = new Date('2026-01-27T16:00:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      // 期望转换为北京时间维度
      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 0
      })
    })

    it('应该正确转换北京时间 2026-01-28 08:00:00', () => {
      // 北京时间 2026-01-28 08:00:00 对应 UTC 时间 2026-01-28 00:00:00
      const utcDate = new Date('2026-01-28T00:00:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 8
      })
    })

    it('应该正确转换北京时间 2026-01-28 23:59:59', () => {
      // 北京时间 2026-01-28 23:59:59 对应 UTC 时间 2026-01-28 15:59:59
      const utcDate = new Date('2026-01-28T15:59:59Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 23
      })
    })
  })

  describe('getTimeDimensions - 跨天边界', () => {
    it('应该正确处理北京时间午夜 00:00', () => {
      // 北京时间 2026-01-28 00:00:00
      // 对应 UTC 时间 2026-01-27 16:00:00
      const utcDate = new Date('2026-01-27T16:00:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      // 期望转换为北京时间维度
      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 0
      })
    })

    it('应该正确处理北京时间 23:59', () => {
      // 北京时间 2026-01-27 23:59:00
      // 对应 UTC 时间 2026-01-27 15:59:00
      const utcDate = new Date('2026-01-27T15:59:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 23
      })
    })
  })

  describe('getTimeDimensions - 跨月边界', () => {
    it('应该正确处理北京时间 2026-02-01 00:00:00', () => {
      // 北京时间 2026-02-01 00:00:00
      // 对应 UTC 时间 2026-01-31 16:00:00
      const utcDate = new Date('2026-01-31T16:00:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 2,
        day: 1,
        hour: 0
      })
    })

    it('应该正确处理北京时间 2026-01-31 23:59:59', () => {
      // 北京时间 2026-01-31 23:59:59
      // 对应 UTC 时间 2026-01-31 15:59:59
      const utcDate = new Date('2026-01-31T15:59:59Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 31,
        hour: 23
      })
    })
  })

  describe('getTimeDimensions - 跨年边界', () => {
    it('应该正确处理北京时间 2026-01-01 00:00:00', () => {
      // 北京时间 2026-01-01 00:00:00
      // 对应 UTC 时间 2025-12-31 16:00:00
      const utcDate = new Date('2025-12-31T16:00:00Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 1,
        hour: 0
      })
    })

    it('应该正确处理北京时间 2025-12-31 23:59:59', () => {
      // 北京时间 2025-12-31 23:59:59
      // 对应 UTC 时间 2025-12-31 15:59:59
      const utcDate = new Date('2025-12-31T15:59:59Z')

      const result = HourlyStatisticsHelper.getTimeDimensions(utcDate)

      expect(result).toEqual({
        year: 2025,
        month: 12,
        day: 31,
        hour: 23
      })
    })
  })

  describe('getTimeDimensions - 夏令时边界（模拟）', () => {
    it('应该正确处理不存在夏令时的中国时区时间', () => {
      // 中国不使用夏令时，所以不应该有时区变化
      const summerDate = new Date('2026-07-15T12:00:00Z')
      const winterDate = new Date('2026-01-15T12:00:00Z')

      const summerResult = HourlyStatisticsHelper.getTimeDimensions(summerDate)
      const winterResult = HourlyStatisticsHelper.getTimeDimensions(winterDate)

      // 两次转换的偏移量应该相同（都是 +8 小时）
      expect(summerResult.hour).toBe(20) // 12 + 8 = 20
      expect(winterResult.hour).toBe(20) // 12 + 8 = 20
    })
  })
})
