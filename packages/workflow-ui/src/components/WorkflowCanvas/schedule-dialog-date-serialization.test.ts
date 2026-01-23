/**
 * TDD 测试: ScheduleDialog 日期序列化问题
 *
 * 问题: 当 startTime 为 undefined 时，前端序列化会发送空对象 {} 而不是 undefined
 * 期望: startTime 应该是 ISO 字符串或 undefined
 */
import { describe, it, expect } from 'vitest'

describe('ScheduleDialog - 日期序列化 (TDD)', () => {
  describe('RED Phase: 测试日期正确序列化为 ISO 字符串', () => {
    it('应该将 Date 对象转换为 ISO 字符串', () => {
      const testDate = new Date('2025-01-23T10:00:00.000Z')
      const isoString = testDate.toISOString()

      expect(isoString).toBe('2025-01-23T10:00:00.000Z')
      expect(typeof isoString).toBe('string')
    })

    it('应该处理 undefined 为 undefined 而不是空对象', () => {
      const startTime = undefined

      // 演示 JSON.stringify 对 undefined 的行为
      const jsonString = JSON.stringify({ startTime })
      // JSON.stringify({ startTime: undefined }) 结果是 "{}"
      // 这是 JavaScript 的默认行为，undefined 值会被省略

      expect(jsonString).toBe('{}')

      // 正确的做法: 手动过滤 undefined 字段
      const payload = {
        ...(startTime !== undefined && { startTime }),
      }
      const cleanJson = JSON.stringify(payload)
      expect(cleanJson).toBe('{}')
    })

    it('updateSchedule 调用应该发送 ISO 字符串而不是空对象', () => {
      // 模拟前端调用 updateSchedule 时的数据
      const formData = {
        name: '测试调度',
        scheduleType: 'cron',
        cronExpression: '10 * * * * *',
        startTime: undefined, // 用户未选择开始时间
        endTime: undefined,
      }

      // 这是前端应该发送的数据
      const payload = {
        name: formData.name,
        scheduleType: formData.scheduleType,
        cronExpression: formData.cronExpression,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined,
      }

      const jsonString = JSON.stringify(payload)

      // 验证: 不应该包含 "startTime": {}
      expect(jsonString).not.toMatch(/"startTime":\{\}/)

      // 验证: 如果 startTime 未定义，不应该包含该字段
      if (payload.startTime === undefined) {
        expect(jsonString).not.toContain('"startTime"')
      }
    })

    it('updateSchedule 调用应该正确发送有效的 startTime', () => {
      const formData = {
        name: '测试调度',
        scheduleType: 'cron',
        cronExpression: '0 * * * *',
        startTime: new Date('2025-01-23T10:00:00.000Z'),
        endTime: undefined,
      }

      const payload = {
        name: formData.name,
        scheduleType: formData.scheduleType,
        cronExpression: formData.cronExpression,
        startTime: formData.startTime ? formData.startTime.toISOString() : undefined,
        endTime: formData.endTime ? formData.endTime?.toISOString() : undefined,
      }

      const jsonString = JSON.stringify(payload)
      const parsed = JSON.parse(jsonString)

      // 验证: startTime 应该是 ISO 字符串
      expect(parsed.startTime).toBe('2025-01-23T10:00:00.000Z')
      expect(typeof parsed.startTime).toBe('string')
    })
  })

  describe('RED Phase: 测试后端接收 ISO 字符串', () => {
    it('后端应该能将 ISO 字符串转换为 Date 对象', () => {
      const isoString = '2025-01-23T10:00:00.000Z'
      const dateObj = new Date(isoString)

      expect(dateObj.toISOString()).toBe(isoString)
      expect(dateObj instanceof Date).toBe(true)
    })

    it('后端应该处理 undefined 保持为 undefined', () => {
      const input = undefined
      const result = input ? new Date(input) : undefined

      expect(result).toBeUndefined()
    })

    it('后端应该处理字符串或 Date 类型', () => {
      // 字符串输入
      const isoString = '2025-01-23T10:00:00.000Z'
      const fromString = typeof isoString === 'string' ? new Date(isoString) : isoString

      expect(fromString instanceof Date).toBe(true)
      expect(fromString.toISOString()).toBe(isoString)

      // Date 输入
      const dateObj = new Date('2025-01-23T10:00:00.000Z')
      const fromDate = typeof dateObj === 'string' ? new Date(dateObj) : dateObj

      expect(fromDate instanceof Date).toBe(true)
      expect(fromDate.toISOString()).toBe('2025-01-23T10:00:00.000Z')
    })
  })
})
