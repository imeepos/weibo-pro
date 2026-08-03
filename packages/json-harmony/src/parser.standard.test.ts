import { describe, it, expect } from 'vitest'
import { parse, RecoveryStrategy } from '../src'

describe('JsonHarmonyParser', () => {
  describe('标准 JSON 解析', () => {
    it('解析基础类型', () => {
      expect(parse('true').data).toBe(true)
      expect(parse('false').data).toBe(false)
      expect(parse('null').data).toBe(null)
      expect(parse('42').data).toBe(42)
      expect(parse('"hello"').data).toBe('hello')
    })

    it('解析对象', () => {
      const result = parse('{"name": "test"}')
      expect(result.data).toEqual({ name: 'test' })
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.StandardJson,
      )
    })

    it('解析数组', () => {
      const result = parse('[1, 2, 3]')
      expect(result.data).toEqual([1, 2, 3])
    })

    it('解析嵌套结构', () => {
      const json = `{
        "user": {
          "name": "张三",
          "age": 30,
          "tags": ["开发者", "设计师"]
        }
      }`
      const result = parse(json)
      expect(result.data).toEqual({
        user: {
          name: '张三',
          age: 30,
          tags: ['开发者', '设计师'],
        },
      })
    })
  })

  describe('统计信息', () => {
    it('记录解析时间', () => {
      const result = parse('{"name": "test"}')
      expect(result.statistics.parseTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('记录使用的恢复策略', () => {
      const result = parse('{name: "test"}')
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0)
    })
  })
})
