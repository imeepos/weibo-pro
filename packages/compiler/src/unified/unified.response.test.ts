/**
 * @fileoverview 统一抽象层 Response 转换测试
 * @description 验证 Anthropic / OpenAI / Google 响应向 UnifiedResponseAst 的转换
 * @version 2.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedResponseAst } from '../ast'
import {
  AnthropicToUnifiedTransformer,
  OpenAIToUnifiedTransformer,
  GoogleToUnifiedTransformer
} from './response-transformer'
import {
  createAnthropicResponse,
  createOpenAIResponse,
  createGoogleResponse,
  createUnifiedResponse
} from './test-utils'

describe('统一抽象层测试套件', () => {
  // ==================== Response 转换测试 ====================
  describe('Response 转换测试', () => {
    let anthropicResponse: any
    let openaiResponse: any
    let googleResponse: any
    let unifiedResponse: UnifiedResponseAst

    beforeEach(() => {
      anthropicResponse = createAnthropicResponse()
      openaiResponse = createOpenAIResponse()
      googleResponse = createGoogleResponse()
      unifiedResponse = createUnifiedResponse()
    })

    describe('AnthropicToUnifiedTransformer', () => {
      let transformer: AnthropicToUnifiedTransformer

      beforeEach(() => {
        transformer = new AnthropicToUnifiedTransformer()
      })

      it('应正确转换 content blocks', () => {
        const result = transformer.transform(anthropicResponse as any)

        expect(result.content.length).toBe(3)
        expect(result.content[0]).toEqual({ type: 'text', text: 'Hello' })
        expect(result.content[1]).toEqual({
          type: 'thinking',
          thinking: 'Let me think',
          signature: 'sig123'
        })
        expect(result.content[2]).toEqual({
          type: 'tool_use',
          id: 'tool_1',
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应正确转换 usage', () => {
        const result = transformer.transform(anthropicResponse as any)

        expect(result.usage).toBeDefined()
        expect(result.usage?.inputTokens).toBe(100)
        expect(result.usage?.outputTokens).toBe(50)
        expect(result.usage?.totalTokens).toBe(150)
      })

      it('应保留 _provider 和 _original', () => {
        const result = transformer.transform(anthropicResponse as any)

        expect(result._provider).toBe('anthropic')
        expect(result._original).toBe(anthropicResponse)
      })

      it('应保留 _anthropic 特有字段', () => {
        const result = transformer.transform(anthropicResponse as any)

        expect(result._anthropic).toBeDefined()
        expect(result._anthropic?.stop_sequence).toBe(null)
        expect(result._anthropic?.type).toBe('message')
      })

      it('应正确映射停止原因', () => {
        anthropicResponse.stop_reason = 'tool_use'
        const result = transformer.transform(anthropicResponse as any)
        expect(result.stopReason).toBe('tool_use')

        anthropicResponse.stop_reason = 'max_tokens'
        const result2 = transformer.transform(anthropicResponse)
        expect(result2.stopReason).toBe('max_tokens')
      })
    })

    describe('OpenAIToUnifiedTransformer', () => {
      let transformer: OpenAIToUnifiedTransformer

      beforeEach(() => {
        transformer = new OpenAIToUnifiedTransformer()
      })

      it('应正确处理 choices[0].delta', () => {
        const result = transformer.transform(openaiResponse as any)

        expect(result.content.length).toBeGreaterThan(0)
        expect(result.content[0]!.type).toBe('text')
      })

      it('应正确解析 tool_calls arguments', () => {
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse).toBeDefined()
        expect(toolUse.name).toBe('get_weather')
        expect(toolUse.input).toEqual({ city: 'Beijing' })
      })

      it('应正确转换 reasoning_content 为 thinking', () => {
        const result = transformer.transform(openaiResponse as any)

        const thinking = result.content.find(c => c.type === 'thinking')
        expect(thinking).toBeDefined()
        expect((thinking as any).thinking).toBe('Let me reason')
      })

      it('应保留 _openai 特有字段', () => {
        const result = transformer.transform(openaiResponse as any)

        expect(result._openai).toBeDefined()
        expect(result._openai?.object).toBe('chat.completion')
        expect(result._openai?.created).toBe(1677655464)
        expect(result._openai?.system_fingerprint).toBe('fp_123')
      })

      it('应处理无效的 JSON arguments', () => {
        openaiResponse.choices[0].delta.tool_calls[0].function.arguments = '{invalid json}'
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({})
      })
    })

    describe('GoogleToUnifiedTransformer', () => {
      let transformer: GoogleToUnifiedTransformer

      beforeEach(() => {
        transformer = new GoogleToUnifiedTransformer()
      })

      it('应正确处理 candidates[0].content.parts', () => {
        const result = transformer.transform(googleResponse as any)

        expect(result.content.length).toBe(2)
        expect(result.content[0]).toEqual({ type: 'text', text: 'Hello' })
        expect(result.content[1]).toEqual({
          type: 'tool_use',
          id: expect.any(String),
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应自动生成 tool_use ID', () => {
        const result = transformer.transform(googleResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.id).toMatch(/^google_fc_\d+_\d+$/)
      })

      it('应保留 _google 特有字段', () => {
        const result = transformer.transform(googleResponse as any)

        expect(result._google).toBeDefined()
        expect(result._google?.modelVersion).toBe('gemini-pro')
      })

      it('应正确转换 usage metadata', () => {
        const result = transformer.transform(googleResponse as any)

        expect(result.usage).toBeDefined()
        expect(result.usage?.inputTokens).toBe(100)
        expect(result.usage?.outputTokens).toBe(50)
        expect(result.usage?._google?.thoughtsTokenCount).toBe(5)
      })

      it('应处理 functionResponse', () => {
        const googleWithResponse = {
          ...googleResponse,
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionResponse: {
                      name: 'get_weather',
                      response: { content: 'Sunny, 25°C' }
                    }
                  }
                ]
              }
            }
          ]
        }

        const result = transformer.transform(googleWithResponse)

        const toolResult = result.content.find(c => c.type === 'tool_result') as any
        expect(toolResult).toBeDefined()
        expect(toolResult.toolUseId).toBe('get_weather')
        expect(toolResult.content).toBe('Sunny, 25°C')
      })
    })
  })
})
