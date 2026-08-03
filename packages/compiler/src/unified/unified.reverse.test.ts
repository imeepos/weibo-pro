/**
 * @fileoverview 统一抽象层无损转换测试
 * @description 验证 UnifiedToOriginalTransformer 将 Unified 响应还原为厂商原始格式
 * @version 2.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedResponseAst } from '../ast'
import { UnifiedToOriginalTransformer } from './reverse-transformer'
import { createReverseUnifiedResponse } from './test-utils'

describe('统一抽象层测试套件', () => {
  // ==================== 无损转换测试 ====================
  describe('无损转换测试', () => {
    let reverseTransformer: UnifiedToOriginalTransformer
    let unifiedResponse: UnifiedResponseAst

    beforeEach(() => {
      reverseTransformer = new UnifiedToOriginalTransformer()
      unifiedResponse = createReverseUnifiedResponse()
    })

    describe('UnifiedToOriginalTransformer.toOriginal()', () => {
      it('应优先使用 _original 实现 100% 无损转换', () => {
        const originalAnthropicResponse = {
          id: 'original_msg',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello World' }
          ],
          stop_reason: 'end_turn'
        }

        const unifiedWithOriginal = new UnifiedResponseAst()
        unifiedWithOriginal._original = originalAnthropicResponse
        unifiedWithOriginal._provider = 'anthropic'

        const result = reverseTransformer.toOriginal(unifiedWithOriginal) as any

        expect(result).toBe(originalAnthropicResponse)
        expect(result.id).toBe('original_msg')
      })

      it('应根据 _provider 选择正确的转换器', () => {
        unifiedResponse._provider = 'anthropic'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.id).toBe('msg_123')
        expect(result.role).toBe('assistant')
        expect(result.type).toBe('message')
        expect(Array.isArray(result.content)).toBe(true)
      })

      it('应正确转换 OpenAI 格式', () => {
        unifiedResponse._provider = 'openai'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.object).toBe('chat.completion')
        expect(result.choices).toBeDefined()
        expect(result.choices[0].finish_reason).toBe('stop')
        expect(result.choices[0].delta.content).toBe('Hello World')
      })

      it('应正确转换 Google 格式', () => {
        unifiedResponse._provider = 'google'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.candidates).toBeDefined()
        expect(result.candidates[0].content.role).toBe('model')
        expect(result.candidates[0].finishReason).toBe('STOP')
      })

      it('应在无 _original 时执行回退转换', () => {
        unifiedResponse._provider = 'anthropic'
        unifiedResponse.content = [
          { type: 'text', text: 'Test' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: { arg: 'value' }
          },
          {
            type: 'tool_result',
            toolUseId: 'tool_1',
            content: 'Tool result',
            isError: false
          }
        ]

        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.content.length).toBe(3)
        expect(result.content[0].type).toBe('text')
        expect(result.content[1].type).toBe('tool_use')
        expect(result.content[2].type).toBe('tool_result')
      })

      it('应在缺少 _provider 时抛出错误', () => {
        const unifiedWithoutProvider = new UnifiedResponseAst()
        unifiedWithoutProvider._original = undefined

        expect(() => reverseTransformer.toOriginal(unifiedWithoutProvider)).toThrow('Unknown provider')
      })

      it('应正确处理 OpenAI tool_calls 的 JSON.stringify', () => {
        unifiedResponse._provider = 'openai'
        unifiedResponse.content = [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: { city: 'Beijing', unit: 'celsius' }
          }
        ]

        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        const toolCall = result.choices[0].delta.tool_calls[0]
        expect(typeof toolCall.function.arguments).toBe('string')
        expect(toolCall.function.arguments).toBe('{"city":"Beijing","unit":"celsius"}')
      })

      it('应正确映射停止原因', () => {
        unifiedResponse._provider = 'anthropic'
        unifiedResponse.stopReason = 'tool_use'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.stop_reason).toBe('tool_use')

        unifiedResponse._provider = 'openai'
        const result2 = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result2.choices[0].finish_reason).toBe('tool_calls')

        unifiedResponse._provider = 'google'
        const result3 = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result3.candidates[0].finishReason).toBe('STOP')
      })

      it('应保留厂商特有字段', () => {
        const unifiedWithAnthropicFields = new UnifiedResponseAst()
        unifiedWithAnthropicFields._provider = 'anthropic'
        unifiedWithAnthropicFields.content = []
        unifiedWithAnthropicFields._anthropic = {
          stop_sequence: 'sequence123',
          type: 'message'
        }

        const result = reverseTransformer.toOriginal(unifiedWithAnthropicFields) as any
        expect(result.stop_sequence).toBe('sequence123')
        expect(result.type).toBe('message')
      })

      it('应正确转换 Usage', () => {
        unifiedResponse.usage = {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          _anthropic: {
            cache_creation_input_tokens: 10
          },
          _openai: {
            prompt_tokens_details: { cached_tokens: 5 }
          },
          _google: {
            trafficType: '0',
            thoughtsTokenCount: 5
          }
        }

        // Anthropic
        unifiedResponse._provider = 'anthropic'
        let result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usage.input_tokens).toBe(100)
        expect(result.usage.output_tokens).toBe(50)

        // OpenAI
        unifiedResponse._provider = 'openai'
        result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usage.prompt_tokens).toBe(100)
        expect(result.usage.completion_tokens).toBe(50)
        expect(result.usage.total_tokens).toBe(150)

        // Google
        unifiedResponse._provider = 'google'
        result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usageMetadata.promptTokenCount).toBe(100)
        expect(result.usageMetadata.candidatesTokenCount).toBe(50)
      })
    })
  })
})
