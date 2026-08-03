import { describe, it, expect } from 'vitest'
import { parse } from '../src'

describe('JsonHarmonyParser', () => {
  describe('常见错误修复', () => {
    it('修复无引号的键', () => {
      const result = parse('{name: "test"}')
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复尾随逗号', () => {
      const result = parse('{"name": "test",}')
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复单引号', () => {
      const result = parse("{'name': 'test'}")
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复混合错误', () => {
      const result = parse("{name: 'test', age: 30,}")
      expect(result.data).toEqual({ name: 'test', age: 30 })
    })
  })

  describe('括号匹配提取', () => {
    it('提取嵌套对象', () => {
      const text =
        '前面的文字 {"outer": {"inner": {"deep": "value"}}} 后面的文字'
      const result = parse(text)
      expect(result.data).toEqual({
        outer: { inner: { deep: 'value' } },
      })
    })

    it('提取包含数组的对象', () => {
      const text = '文字 {"array": [1, 2, {"nested": true}]} 文字'
      const result = parse(text)
      expect(result.data).toEqual({
        array: [1, 2, { nested: true }],
      })
    })

    it('提取包含转义字符的字符串', () => {
      const text = '{"message": "He said \\"Hello\\" to me"}'
      const result = parse(text)
      expect(result.data).toEqual({
        message: 'He said "Hello" to me',
      })
    })
  })
})
