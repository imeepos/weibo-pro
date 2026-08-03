/**
 * @fileoverview 统一抽象层类型定义测试
 * @description 验证 UnifiedProvider、UnifiedRole、UnifiedContent 等类型定义的正确性
 * @version 2.0
 */

import { describe, it, expect } from 'vitest'
import {
  UnifiedProvider,
  UnifiedRole,
  UnifiedStopReason,
  UnifiedContent,
  UnifiedTextContent,
  UnifiedThinkingContent,
  UnifiedToolUseContent,
  UnifiedToolResultContent,
  UnifiedImageContent,
  UnifiedMessage,
  UnifiedToolParameters,
  UnifiedUsage
} from '../ast'

describe('统一抽象层测试套件', () => {
  // ==================== 类型定义测试 ====================
  describe('类型定义测试', () => {
    describe('UnifiedProvider', () => {
      it('应包含所有支持的提供商', () => {
        const providers: UnifiedProvider[] = ['anthropic', 'openai', 'google']
        expect(providers).toEqual(['anthropic', 'openai', 'google'])
      })
    })

    describe('UnifiedRole', () => {
      it('应包含所有支持的角色', () => {
        const roles: UnifiedRole[] = ['system', 'user', 'assistant', 'tool']
        expect(roles).toEqual(['system', 'user', 'assistant', 'tool'])
      })
    })

    describe('UnifiedStopReason', () => {
      it('应包含所有停止原因类型', () => {
        const reasons: UnifiedStopReason[] = [
          'end_turn',
          'tool_use',
          'max_tokens',
          'stop_sequence',
          'content_filter',
          'error'
        ]
        expect(reasons).toEqual([
          'end_turn',
          'tool_use',
          'max_tokens',
          'stop_sequence',
          'content_filter',
          'error'
        ])
      })
    })

    describe('UnifiedContent 联合类型', () => {
      it('应支持文本内容', () => {
        const textContent: UnifiedContent = {
          type: 'text',
          text: 'Hello World'
        }
        expect(textContent.type).toBe('text')
        expect((textContent as UnifiedTextContent).text).toBe('Hello World')
      })

      it('应支持思考内容', () => {
        const thinkingContent: UnifiedContent = {
          type: 'thinking',
          thinking: 'Let me think...',
          signature: 'sig123'
        }
        expect(thinkingContent.type).toBe('thinking')
        expect((thinkingContent as UnifiedThinkingContent).thinking).toBe('Let me think...')
        expect((thinkingContent as UnifiedThinkingContent).signature).toBe('sig123')
      })

      it('应支持工具调用内容', () => {
        const toolUseContent: UnifiedContent = {
          type: 'tool_use',
          id: 'tool_123',
          name: 'get_weather',
          input: { city: 'Beijing' }
        }
        expect(toolUseContent.type).toBe('tool_use')
        expect((toolUseContent as UnifiedToolUseContent).id).toBe('tool_123')
        expect((toolUseContent as UnifiedToolUseContent).name).toBe('get_weather')
      })

      it('应支持工具结果内容', () => {
        const toolResultContent: UnifiedContent = {
          type: 'tool_result',
          toolUseId: 'tool_123',
          content: 'Sunny, 25°C',
          isError: false
        }
        expect(toolResultContent.type).toBe('tool_result')
        expect((toolResultContent as UnifiedToolResultContent).toolUseId).toBe('tool_123')
      })

      it('应支持图像内容', () => {
        const imageContent: UnifiedContent = {
          type: 'image',
          source: {
            type: 'base64',
            mediaType: 'image/png',
            data: 'base64data'
          }
        }
        expect(imageContent.type).toBe('image')
        expect((imageContent as UnifiedImageContent).source.type).toBe('base64')
      })
    })

    describe('UnifiedMessage', () => {
      it('应支持字符串内容', () => {
        const message: UnifiedMessage = {
          role: 'user',
          content: 'Hello'
        }
        expect(message.role).toBe('user')
        expect(typeof message.content).toBe('string')
      })

      it('应支持数组内容', () => {
        const message: UnifiedMessage = {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'thinking', thinking: 'Thinking...' }
          ]
        }
        expect(Array.isArray(message.content)).toBe(true)
        expect(message.content.length).toBe(2)
      })
    })

    describe('UnifiedTool', () => {
      it('应正确定义工具参数 Schema', () => {
        const params: UnifiedToolParameters = {
          type: 'object',
          properties: {
            city: { type: 'string', description: '城市名称' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
          },
          required: ['city']
        }
        expect(params.type).toBe('object')
        expect(params.properties.city!.type).toBe('string')
        expect(params.required).toEqual(['city'])
      })
    })

    describe('UnifiedUsage', () => {
      it('应支持基本 token 统计', () => {
        const usage: UnifiedUsage = {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150
        }
        expect(usage.inputTokens).toBe(100)
        expect(usage.outputTokens).toBe(50)
        expect(usage.totalTokens).toBe(150)
      })

      it('应保留厂商特有字段', () => {
        const usage: UnifiedUsage = {
          inputTokens: 100,
          outputTokens: 50,
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
        expect(usage._anthropic?.cache_creation_input_tokens).toBe(10)
        expect(usage._openai?.prompt_tokens_details?.cached_tokens).toBe(5)
        expect(usage._google?.thoughtsTokenCount).toBe(5)
      })
    })
  })
})
