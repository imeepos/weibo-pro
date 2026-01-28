import { describe, it, expect } from 'vitest'
import { HourlyStatisticsHelper } from '../subscribers/hourly-statistics.helper'

/**
 * TDD Phase 1: RED - 编写失败的测试用例
 *
 * 测试时区转换逻辑
 * 函数接收表示"北京时间值"的 Date 对象（在本地时区创建），输出 UTC 时间维度
 * 例如：new Date(2026, 0, 28, 0, 0, 0) 在 UTC+8 机器上表示本地 2026-01-28 00:00:00
 *      对应 UTC 2026-01-27 16:00:00，函数再减 8 小时得到 2026-01-27 08:00:00
 */

describe('HourlyStatisticsHelper - 时区转换', () => {
  describe('getTimeDimensions - 基本转换', () => {
    it('应该正确转换北京时间 2026-01-28 00:00:00', () => {
      // 本地时间 2026-01-28 00:00:00 (CST) = UTC 2026-01-27 16:00:00
      // 函数减 8h 后 = UTC 2026-01-27 08:00:00
      const beijingTime = new Date(2026, 0, 28, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 8
      })
    })

    it('应该正确转换北京时间 2026-01-28 08:00:00', () => {
      // 本地时间 2026-01-28 08:00:00 (CST) = UTC 2026-01-28 00:00:00
      // 函数减 8h 后 = UTC 2026-01-27 16:00:00
      const beijingTime = new Date(2026, 0, 28, 8, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 16
      })
    })

    it('应该正确转换北京时间 2026-01-28 23:59:59', () => {
      // 本地时间 2026-01-28 23:59:59 (CST) = UTC 2026-01-28 15:59:59
      // 函数减 8h 后 = UTC 2026-01-28 07:59:59
      const beijingTime = new Date(2026, 0, 28, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 7
      })
    })
  })

  describe('getTimeDimensions - 跨天边界', () => {
    it('应该正确处理北京时间午夜 00:00', () => {
      // 本地时间 2026-01-28 00:00:00 (CST) = UTC 2026-01-27 16:00:00
      // 函数减 8h 后 = UTC 2026-01-27 08:00:00
      const beijingTime = new Date(2026, 0, 28, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 8
      })
    })

    it('应该正确处理北京时间 23:59', () => {
      // 本地时间 2026-01-27 23:59:00 (CST) = UTC 2026-01-27 15:59:00
      // 函数减 8h 后 = UTC 2026-01-27 07:59:00
      const beijingTime = new Date(2026, 0, 27, 23, 59, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 7
      })
    })
  })

  describe('getTimeDimensions - 跨月边界', () => {
    it('应该正确处理北京时间 2026-02-01 00:00:00', () => {
      // 本地时间 2026-02-01 00:00:00 (CST) = UTC 2026-01-31 16:00:00
      // 函数减 8h 后 = UTC 2026-01-31 08:00:00
      const beijingTime = new Date(2026, 1, 1, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 31,
        hour: 8
      })
    })

    it('应该正确处理北京时间 2026-01-31 23:59:59', () => {
      // 本地时间 2026-01-31 23:59:59 (CST) = UTC 2026-01-31 15:59:59
      // 函数减 8h 后 = UTC 2026-01-31 07:59:59
      const beijingTime = new Date(2026, 0, 31, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 31,
        hour: 7
      })
    })
  })

  describe('getTimeDimensions - 跨年边界', () => {
    it('应该正确处理北京时间 2026-01-01 00:00:00', () => {
      // 本地时间 2026-01-01 00:00:00 (CST) = UTC 2025-12-31 16:00:00
      // 函数减 8h 后 = UTC 2025-12-31 08:00:00
      const beijingTime = new Date(2026, 0, 1, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2025,
        month: 12,
        day: 31,
        hour: 8
      })
    })

    it('应该正确处理北京时间 2025-12-31 23:59:59', () => {
      // 本地时间 2025-12-31 23:59:59 (CST) = UTC 2025-12-31 15:59:59
      // 函数减 8h 后 = UTC 2025-12-31 07:59:59
      const beijingTime = new Date(2025, 11, 31, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2025,
        month: 12,
        day: 31,
        hour: 7
      })
    })
  })

  describe('getTimeDimensions - 夏令时边界（模拟）', () => {
    it('应该正确处理不存在夏令时的中国时区时间', () => {
      // 中国不使用夏令时，所以不应该有时区变化
      // 本地时间 2026-07-15 12:00:00 (CST) = UTC 2026-07-15 04:00:00
      // 函数减 8h 后 = UTC 2026-07-15 20:00:00 (前一天)
      const summerDate = new Date(2026, 6, 15, 12, 0, 0)
      // 本地时间 2026-01-15 12:00:00 (CST) = UTC 2026-01-15 04:00:00
      // 函数减 8h 后 = UTC 2026-01-15 20:00:00 (前一天)
      const winterDate = new Date(2026, 0, 15, 12, 0, 0)

      const summerResult = HourlyStatisticsHelper.getTimeDimensions(summerDate)
      const winterResult = HourlyStatisticsHelper.getTimeDimensions(winterDate)

      // 两次转换的偏移量应该相同
      expect(summerResult.hour).toBe(20)
      expect(winterResult.hour).toBe(20)
    })
  })
})
