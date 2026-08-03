import { describe, it, expect } from 'vitest'
import { HourlyStatisticsHelper } from '../subscribers/hourly-statistics.helper'

/**
 * TDD Phase 1: RED - 编写失败的测试用例
 *
 * 测试 UTC 时间维度转换逻辑
 * 函数接收 Date 对象，输出该时刻对应的 UTC 时间维度（year/month/day/hour）。
 *
 * 说明（自动使用 UTC 时间维度）：
 * - 微博 API 返回的 created_at 格式: "Tue Jan 27 18:01:37 +0800 2026"
 * - Node.js Date 对象会正确解析时区，内部统一存储为 UTC 时间
 * - PostgreSQL timestamptz 字段也存储 UTC 时间
 * - 因此 getTimeDimensions 直接返回 UTC 分量（getUTCFullYear/getUTCMonth/getUTCDate/getUTCHours）
 *
 * 例如：new Date(2026, 0, 28, 0, 0, 0) 在 UTC+8 机器上表示本地 2026-01-28 00:00:00
 *      对应 UTC 2026-01-27 16:00:00，因此 hour 应为 16（而非"再减 8 小时"后的 8）。
 */

describe('HourlyStatisticsHelper - UTC 时间维度', () => {
  describe('getTimeDimensions - 基本转换', () => {
    it('应该正确转换北京时间 2026-01-28 00:00:00', () => {
      // 本地时间 2026-01-28 00:00:00 (CST, UTC+8) = UTC 2026-01-27 16:00:00
      const beijingTime = new Date(2026, 0, 28, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 16
      })
    })

    it('应该正确转换北京时间 2026-01-28 08:00:00', () => {
      // 本地时间 2026-01-28 08:00:00 (CST, UTC+8) = UTC 2026-01-28 00:00:00
      const beijingTime = new Date(2026, 0, 28, 8, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 0
      })
    })

    it('应该正确转换北京时间 2026-01-28 23:59:59', () => {
      // 本地时间 2026-01-28 23:59:59 (CST, UTC+8) = UTC 2026-01-28 15:59:59
      const beijingTime = new Date(2026, 0, 28, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 28,
        hour: 15
      })
    })
  })

  describe('getTimeDimensions - 跨天边界', () => {
    it('应该正确处理北京时间午夜 00:00', () => {
      // 本地时间 2026-01-28 00:00:00 (CST, UTC+8) = UTC 2026-01-27 16:00:00
      const beijingTime = new Date(2026, 0, 28, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 16
      })
    })

    it('应该正确处理北京时间 23:59', () => {
      // 本地时间 2026-01-27 23:59:00 (CST, UTC+8) = UTC 2026-01-27 15:59:00
      const beijingTime = new Date(2026, 0, 27, 23, 59, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 27,
        hour: 15
      })
    })
  })

  describe('getTimeDimensions - 跨月边界', () => {
    it('应该正确处理北京时间 2026-02-01 00:00:00', () => {
      // 本地时间 2026-02-01 00:00:00 (CST, UTC+8) = UTC 2026-01-31 16:00:00
      const beijingTime = new Date(2026, 1, 1, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 31,
        hour: 16
      })
    })

    it('应该正确处理北京时间 2026-01-31 23:59:59', () => {
      // 本地时间 2026-01-31 23:59:59 (CST, UTC+8) = UTC 2026-01-31 15:59:59
      const beijingTime = new Date(2026, 0, 31, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2026,
        month: 1,
        day: 31,
        hour: 15
      })
    })
  })

  describe('getTimeDimensions - 跨年边界', () => {
    it('应该正确处理北京时间 2026-01-01 00:00:00', () => {
      // 本地时间 2026-01-01 00:00:00 (CST, UTC+8) = UTC 2025-12-31 16:00:00
      const beijingTime = new Date(2026, 0, 1, 0, 0, 0)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2025,
        month: 12,
        day: 31,
        hour: 16
      })
    })

    it('应该正确处理北京时间 2025-12-31 23:59:59', () => {
      // 本地时间 2025-12-31 23:59:59 (CST, UTC+8) = UTC 2025-12-31 15:59:59
      const beijingTime = new Date(2025, 11, 31, 23, 59, 59)
      const result = HourlyStatisticsHelper.getTimeDimensions(beijingTime)

      expect(result).toEqual({
        year: 2025,
        month: 12,
        day: 31,
        hour: 15
      })
    })
  })

  describe('getTimeDimensions - 夏令时边界（模拟）', () => {
    it('中国不使用夏令时，正午 12 点对应的 UTC hour 恒为 4', () => {
      // 中国不使用夏令时，UTC+8 全年固定，所以 UTC 偏移不会随季节变化
      // 本地时间 2026-07-15 12:00:00 (CST, UTC+8) = UTC 2026-07-15 04:00:00
      const summerDate = new Date(2026, 6, 15, 12, 0, 0)
      // 本地时间 2026-01-15 12:00:00 (CST, UTC+8) = UTC 2026-01-15 04:00:00
      const winterDate = new Date(2026, 0, 15, 12, 0, 0)

      const summerResult = HourlyStatisticsHelper.getTimeDimensions(summerDate)
      const winterResult = HourlyStatisticsHelper.getTimeDimensions(winterDate)

      // 两次转换的偏移量应该相同，均为 UTC hour 4
      expect(summerResult.hour).toBe(4)
      expect(winterResult.hour).toBe(4)
    })
  })
})
