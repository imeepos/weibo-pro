import { describe, it, expect } from 'vitest'
import { HourlyStatisticsHelper } from '@sker/entities'

describe('HourlyStatisticsHelper - UTC 时间维度', () => {
  it('应该直接返回 UTC 时间维度', () => {
    const utcDate = new Date('2026-01-27T16:00:00Z')

    expect(HourlyStatisticsHelper.getTimeDimensions(utcDate)).toEqual({
      year: 2026,
      month: 1,
      day: 27,
      hour: 16,
    })
  })

  it('应该正确处理 UTC 零点', () => {
    const utcDate = new Date('2026-01-28T00:00:00Z')

    expect(HourlyStatisticsHelper.getTimeDimensions(utcDate)).toEqual({
      year: 2026,
      month: 1,
      day: 28,
      hour: 0,
    })
  })

  it('应该正确处理跨月边界', () => {
    const utcDate = new Date('2026-01-31T23:59:59Z')

    expect(HourlyStatisticsHelper.getTimeDimensions(utcDate)).toEqual({
      year: 2026,
      month: 1,
      day: 31,
      hour: 23,
    })
  })

  it('应该正确处理跨年边界', () => {
    const utcDate = new Date('2025-12-31T23:59:59Z')

    expect(HourlyStatisticsHelper.getTimeDimensions(utcDate)).toEqual({
      year: 2025,
      month: 12,
      day: 31,
      hour: 23,
    })
  })
})
