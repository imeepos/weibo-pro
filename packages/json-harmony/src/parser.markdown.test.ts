import { describe, it, expect } from 'vitest'
import { parse } from '../src'
import { LLM_RESPONSE_JSON_BLOCK } from './__fixtures__/llm-response'

describe('JsonHarmonyParser', () => {
  describe('Markdown 代码块提取', () => {
    it('提取 JSON 代码块', () => {
      const markdown = '```json\n{"name": "test"}\n```'
      const result = parse(markdown)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('提取无语言标识的代码块', () => {
      const markdown = '```\n{"name": "test"}\n```'
      const result = parse(markdown)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('提取包含前后文本的代码块', () => {
      const text = '这是一些说明文字\n```json\n{"name": "test"}\n```\n还有更多文字'
      const result = parse(text)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('解析 LLM 返回的完整 JSON 代码块（复现 EventAuthGenerateAstVisitor 失败场景）', () => {
      // 这是从真实日志中复制的 LLM 响应
      const llmResponse = LLM_RESPONSE_JSON_BLOCK

      const result = parse(llmResponse)

      // 应该成功解析为对象
      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')
      expect(result.data).not.toBe(null)

      // 验证字段
      const data = result.data as any
      expect(data.title).toBe('腾讯回应元宝AI辱骂用户')
      expect(data.category_id).toBe('fd1d8f5f-5c5f-4be3-9864-f306147dd3f8')
      expect(data.sentiment).toEqual({
        positive: 0.1,
        negative: 0.7,
        neutral: 0.2
      })
      expect(data.keywords).toEqual(['腾讯', '元宝AI', '辱骂用户', '新浪科技', 'AI安全'])
      expect(data.alreadyExists).toBe(true)
      expect(data.existingEventId).toBe('262256e3-a2bf-4ea6-a6fb-fafb20b5f6c1')
    })
  })
})
