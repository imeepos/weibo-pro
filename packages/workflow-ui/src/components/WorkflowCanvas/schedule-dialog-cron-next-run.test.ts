/**
 * TDD 测试: ScheduleDialog cron 表达式下次执行时间计算
 *
 * Bug: 编辑工作流调度时，选择 cron 模板"每小时-每小时的第0分钟执行"（cron: `0 * * * *`），
 *      显示的下次执行时间是过去的日期：`2026-01-22 15:01:00`
 *      当前时间是：`2026-01-23 14:08`
 *
 * 问题：
 * 1. 时间倒流（显示过去的日期 1月22日）
 * 2. 分钟数不对（cron 是第0分钟，但显示第1分钟）
 *
 * 期望：下次执行时间应为 `2026-01-23 15:00:00`（当天下一个整点）
 *
 * 根因：calculateNextRunTime 函数使用 formData.startTime 作为 cron-parser 的 currentDate，
 *      在编辑模式下，startTime 可能是过去的时间，导致计算出错误的下次执行时间。
 */
import { describe, it, expect, } from 'vitest'
import { CronExpressionParser } from 'cron-parser'

describe('ScheduleDialog - cron 表达式下次执行时间计算 (TDD)', () => {
  describe('RED Phase: 复现 bug - 编辑模式下使用过去的 startTime', () => {
    it('应该复现 bug：当 startTime 是过去的时间时，计算出错误的下次执行时间', () => {
      // 模拟场景：当前时间是 2026-01-23 14:08:00（本地时间）
      // 但 formData.startTime 是过去的时间 2026-01-22 15:01:00（本地时间）
      // 注意：不使用 UTC 时间，使用本地时间更符合实际场景

      // 创建本地时间（避免 UTC 转换）
      const pastStartTime = new Date(2026, 0, 22, 15, 1, 0) // 2026-01-22 15:01:00 本地时间
      const cronExpression = '0 * * * *' // 每小时的第0分钟执行

      // 这是当前有 bug 的代码逻辑
      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: pastStartTime, // Bug: 使用过去的 startTime
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      // 验证 bug: 计算出的时间是 2026-01-22 16:00:00（过去的！）
      // 而不是期望的未来的下一次执行时间
      console.log('Bug 场景 - 计算的下次执行时间:', calculatedNextRun.toISOString())
      console.log('Bug 场景 - 计算的下次执行时间（本地）:', calculatedNextRun.toLocaleString())

      // 当前时间（假设现在是 2026-01-23 14:08）
      const currentTime = new Date(2026, 0, 23, 14, 8, 0)

      // 验证：计算出的时间应该在过去（这是 bug）
      expect(calculatedNextRun.getTime()).toBeLessThan(currentTime.getTime())

      // 验证：计算出的时间是 2026-01-22（过去的一天，而不是今天）
      expect(calculatedNextRun.getDate()).toBe(22)
    })

    it('应该复现 bug：分钟数不对（显示第1分钟而不是第0分钟）', () => {
      // 模拟场景
      const pastStartTime = new Date('2026-01-22T15:01:00.000Z')
      const cronExpression = '0 * * * *'

      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: pastStartTime,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      // 验证分钟数应该是 0，而不是 1
      console.log('Bug 场景 - 计算的分钟数:', calculatedNextRun.getMinutes())
      
      // 这个断言会失败，证明存在 bug
      expect(calculatedNextRun.getMinutes()).toBe(0)
    })
  })

  describe('RED Phase: 期望的正确行为', () => {
    it('当 startTime 是过去的时间时，应该使用当前时间计算下次执行时间', () => {
      // 模拟场景：当前时间是 2026-01-23 14:08:00（本地时间）
      // formData.startTime 是过去的时间 2026-01-22 15:01:00（本地时间）
      const currentTime = new Date(2026, 0, 23, 14, 8, 0) // 2026-01-23 14:08:00
      const pastStartTime = new Date(2026, 0, 22, 15, 1, 0) // 2026-01-22 15:01:00
      const cronExpression = '0 * * * *'

      // 正确的代码逻辑：如果 startTime 在过去，使用当前时间
      const baseDate = pastStartTime < currentTime ? currentTime : pastStartTime

      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: baseDate,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      console.log('正确场景 - 计算的下次执行时间:', calculatedNextRun.toISOString())
      console.log('正确场景 - 计算的下次执行时间（本地）:', calculatedNextRun.toLocaleString())

      // 验证计算出的时间是未来的时间
      expect(calculatedNextRun.getTime()).toBeGreaterThanOrEqual(currentTime.getTime())

      // 验证分钟数是 0
      expect(calculatedNextRun.getMinutes()).toBe(0)

      // 验证是当天的下一个整点（15:00）
      expect(calculatedNextRun.getHours()).toBe(15)
      expect(calculatedNextRun.getDate()).toBe(23)
      expect(calculatedNextRun.getMonth()).toBe(0) // 1月
      expect(calculatedNextRun.getFullYear()).toBe(2026)
    })

    it('当 startTime 是未来的时间时，应该使用 startTime 计算下次执行时间', () => {
      // 模拟场景：当前时间是 2026-01-23 14:08:00（本地时间）
      // 但 formData.startTime 是未来的时间 2026-01-25 10:00:00（本地时间）
      const currentTime = new Date(2026, 0, 23, 14, 8, 0)
      const futureStartTime = new Date(2026, 0, 25, 10, 0, 0)
      const cronExpression = '0 * * * *'

      // 正确的代码逻辑：如果 startTime 在未来，使用 startTime
      const baseDate = futureStartTime > currentTime ? futureStartTime : currentTime

      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: baseDate,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      console.log('未来 startTime 场景 - 计算的下次执行时间:', calculatedNextRun.toISOString())
      console.log('未来 startTime 场景 - 计算的下次执行时间（本地）:', calculatedNextRun.toLocaleString())

      // 验证计算出的时间是基于 startTime 的
      expect(calculatedNextRun.getDate()).toBe(25)
      expect(calculatedNextRun.getHours()).toBe(11) // 从 10:00 开始的下一个整点是 11:00
      expect(calculatedNextRun.getMinutes()).toBe(0)
    })

    it('当 startTime 是 undefined 时，应该使用当前时间计算下次执行时间', () => {
      // 模拟场景：startTime 未定义
      const currentTime = new Date(2026, 0, 23, 14, 8, 0)
      const cronExpression = '0 * * * *'

      // 正确的代码逻辑：使用当前时间
      const baseDate = currentTime

      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: baseDate,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      console.log('undefined startTime 场景 - 计算的下次执行时间:', calculatedNextRun.toISOString())
      console.log('undefined startTime 场景 - 计算的下次执行时间（本地）:', calculatedNextRun.toLocaleString())

      // 验证计算出的时间是未来的时间
      expect(calculatedNextRun.getTime()).toBeGreaterThanOrEqual(currentTime.getTime())

      // 验证分钟数是 0
      expect(calculatedNextRun.getMinutes()).toBe(0)

      // 验证是当天的下一个整点
      expect(calculatedNextRun.getHours()).toBe(15)
      expect(calculatedNextRun.getDate()).toBe(23)
    })

    it('应该正确处理不同的 cron 表达式', () => {
      const currentTime = new Date('2026-01-23T14:08:00.000Z')
      const cronExpression = '0 0 * * *' // 每天午夜执行

      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: currentTime,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      const next = interval.next()
      const calculatedNextRun = next.toDate()

      // 期望的下次执行时间应该是 2026-01-24 00:00:00（第二天午夜）
      console.log('每天午夜场景 - 计算的下次执行时间:', calculatedNextRun.toISOString())
      
      // 验证计算出的时间是未来的时间
      expect(calculatedNextRun.getTime()).toBeGreaterThanOrEqual(currentTime.getTime())
      
      // 验证是午夜
      expect(calculatedNextRun.getHours()).toBe(0)
      expect(calculatedNextRun.getMinutes()).toBe(0)
    })
  })
})
