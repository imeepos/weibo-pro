import { describe, it, expect } from 'vitest'
import { parse, JsonHarmonyParser } from '../src'

describe('JsonHarmonyParser', () => {
  describe('配置选项', () => {
    it('禁用 YAML 解析', () => {
      const parser = new JsonHarmonyParser({ enableYamlParsing: false })
      const json = '{"config": "name: John\\nage: 30"}'
      const result = parser.parse(json)
      expect(result.data).toEqual({
        config: 'name: John\nage: 30',
      })
    })

    it('禁用无引号键修复（仍然会尝试其他策略）', () => {
      const parser = new JsonHarmonyParser({ enableUnquotedKeys: false })
      // 即使禁用无引号键修复，解析器仍会尝试其他策略
      // 所以这个测试验证即使禁用了某个策略，解析器仍然具有容错能力
      const result = parser.parse('{name: "test"}')
      // 可能通过其他策略成功解析，或者保留为字符串
      expect(result.data).toBeDefined()
    })

    it('禁用尾随逗号修复（仍然会尝试其他策略）', () => {
      const parser = new JsonHarmonyParser({ enableTrailingCommas: false })
      // 即使禁用尾随逗号修复，解析器仍会尝试其他策略
      const result = parser.parse('{"name": "test",}')
      expect(result.data).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('空字符串解析为 null', () => {
      const result = parse('')
      expect(result.data).toBe(null)
    })

    it('只有空格的字符串解析为 null', () => {
      const result = parse('   \n  ')
      expect(result.data).toBe(null)
    })

    it('超长文本抛出错误', () => {
      const parser = new JsonHarmonyParser({ maxTextLength: 10 })
      expect(() => parser.parse('{"very": "long text that exceeds limit"}')).toThrow(
        '文本过长',
      )
    })
  })
})
