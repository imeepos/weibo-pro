/**
 * @fileoverview 统一抽象层 Request 转换测试
 * @description 验证 UnifiedRequestAst 向 Anthropic / OpenAI / Google 请求格式的转换
 * @version 2.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedRequestAst } from '../ast'
import {
  UnifiedToAnthropicTransformer,
  UnifiedToOpenAITransformer,
  UnifiedToGoogleTransformer
} from './request-transformer'
import { createUnifiedRequest } from './test-utils'

describe('统一抽象层测试套件', () => {
  // ==================== Request 转换测试 ====================
  describe('Request 转换测试', () => {
    let unifiedRequest: UnifiedRequestAst
    let transformer: any

    beforeEach(() => {
      unifiedRequest = createUnifiedRequest()
    })

    describe('UnifiedToAnthropicTransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToAnthropicTransformer()
      })

      it('应正确转换基本消息（system, user, assistant）', () => {
        const anthropicRequest = transformer.transform(unifiedRequest)

        expect(anthropicRequest.model).toBe('claude-3-sonnet')
        expect(anthropicRequest.max_tokens).toBe(1024)
        expect(anthropicRequest.system).toBe('You are a helpful assistant.')
        expect(anthropicRequest.temperature).toBe(0.7)
        expect(anthropicRequest.messages.length).toBe(1)
        expect(anthropicRequest.messages[0].role).toBe('user')
        expect(anthropicRequest.messages[0].content).toBe('Hello')
      })

      it('应正确过滤 system 消息', () => {
        const requestWithSystemInMessages = new UnifiedRequestAst()
        requestWithSystemInMessages.model = 'claude-3'
        requestWithSystemInMessages.messages = [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' }
        ]

        const anthropicRequest = transformer.transform(requestWithSystemInMessages)

        expect(anthropicRequest.messages.length).toBe(1)
        expect(anthropicRequest.messages[0].role).toBe('user')
        expect(anthropicRequest.messages[0].content).toBe('User message')
      })

      it('应正确转换工具', () => {
        const anthropicRequest = transformer.transform(unifiedRequest)

        expect(anthropicRequest.tools).toBeDefined()
        expect(anthropicRequest.tools?.length).toBe(1)
        expect(anthropicRequest.tools?.[0].name).toBe('get_weather')
        expect(anthropicRequest.tools?.[0].description).toBe('Get weather information')
        expect(anthropicRequest.tools?.[0].input_schema.type).toBe('object')
      })

      it('应正确转换复杂内容块', () => {
        const requestWithComplexContent = new UnifiedRequestAst()
        requestWithComplexContent.model = 'claude-3'
        requestWithComplexContent.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Let me think' },
              { type: 'thinking', thinking: 'Internal reasoning' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const anthropicRequest = transformer.transform(requestWithComplexContent)

        expect(anthropicRequest.messages[0].content.length).toBe(3)
        expect(anthropicRequest.messages[0].content[0]).toEqual({ type: 'text', text: 'Let me think' })
        expect(anthropicRequest.messages[0].content[1]).toEqual({
          type: 'thinking',
          thinking: 'Internal reasoning',
          signature: ''
        })
        expect(anthropicRequest.messages[0].content[2]).toEqual({
          type: 'tool_use',
          id: 'tool_1',
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应抛出不支持的图像内容错误', () => {
        const requestWithImage = new UnifiedRequestAst()
        requestWithImage.model = 'claude-3'
        requestWithImage.messages = [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  mediaType: 'image/png',
                  data: 'data'
                }
              }
            ]
          }
        ]

        expect(() => transformer.transform(requestWithImage)).toThrow('Unsupported content type: image')
      })
    })

    describe('UnifiedToOpenAITransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToOpenAITransformer()
      })

      it('应正确转换基本消息', () => {
        const openaiRequest = transformer.transform(unifiedRequest)

        expect(openaiRequest.model).toBe('claude-3-sonnet')
        expect(openaiRequest.max_tokens).toBe(1024)
        expect(openaiRequest.temperature).toBe(0.7)
        expect(openaiRequest.messages.length).toBe(2)
        expect(openaiRequest.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' })
        expect(openaiRequest.messages[1]).toEqual({ role: 'user', content: 'Hello' })
      })

      it('应正确处理 tool_calls 特殊格式', () => {
        const requestWithToolCalls = new UnifiedRequestAst()
        requestWithToolCalls.model = 'gpt-4'
        requestWithToolCalls.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'I will call the weather tool' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const openaiRequest = transformer.transform(requestWithToolCalls)

        expect(openaiRequest.messages[0].tool_calls).toBeDefined()
        expect(openaiRequest.messages[0].tool_calls?.length).toBe(1)
        expect(openaiRequest.messages[0].tool_calls?.[0].function.name).toBe('get_weather')
        expect(openaiRequest.messages[0].tool_calls?.[0].function.arguments).toBe('{"city":"Beijing"}')
        expect(openaiRequest.messages[0].content).toBe('I will call the weather tool')
      })

      it('应正确转换 tool_result 为 tool role message', () => {
        const requestWithToolResult = new UnifiedRequestAst()
        requestWithToolResult.model = 'gpt-4'
        requestWithToolResult.messages = [
          {
            role: 'tool',
            content: [
              {
                type: 'tool_result',
                toolUseId: 'tool_1',
                content: 'Sunny, 25°C',
                isError: false
              }
            ]
          }
        ]

        const openaiRequest = transformer.transform(requestWithToolResult)

        expect(openaiRequest.messages[0].role).toBe('tool')
        expect(openaiRequest.messages[0].content).toBe('Sunny, 25°C')
        expect(openaiRequest.messages[0].tool_call_id).toBe('tool_1')
      })

      it('应正确转换工具格式', () => {
        const openaiRequest = transformer.transform(unifiedRequest)

        expect(openaiRequest.tools).toBeDefined()
        expect(openaiRequest.tools?.length).toBe(1)
        expect(openaiRequest.tools?.[0].type).toBe('function')
        expect(openaiRequest.tools?.[0].function.name).toBe('get_weather')
        expect(openaiRequest.tools?.[0].function.parameters.type).toBe('object')
      })
    })

    describe('UnifiedToGoogleTransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToGoogleTransformer()
      })

      it('应正确转换 generationConfig', () => {
        const googleRequest = transformer.transform(unifiedRequest)

        expect(googleRequest.generationConfig).toBeDefined()
        expect(googleRequest.generationConfig.maxOutputTokens).toBe(1024)
        expect(googleRequest.generationConfig.temperature).toBe(0.7)
      })

      it('应正确映射角色', () => {
        const requestWithRoles = new UnifiedRequestAst()
        requestWithRoles.model = 'gemini-pro'
        requestWithRoles.messages = [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant response' },
          { role: 'tool', content: 'Tool result' }
        ]

        const googleRequest = transformer.transform(requestWithRoles)

        expect(googleRequest.contents.length).toBe(3)
        expect(googleRequest.contents[0].role).toBe('user')
        expect(googleRequest.contents[1].role).toBe('model')
        expect(googleRequest.contents[2].role).toBe('function')
      })

      it('应正确转换 contents.parts', () => {
        const requestWithParts = new UnifiedRequestAst()
        requestWithParts.model = 'gemini-pro'
        requestWithParts.messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const googleRequest = transformer.transform(requestWithParts)

        expect(googleRequest.contents[0].parts.length).toBe(2)
        expect(googleRequest.contents[0].parts[0]).toEqual({ text: 'Hello' })
        expect(googleRequest.contents[0].parts[1]).toEqual({
          functionCall: {
            name: 'get_weather',
            args: { city: 'Beijing' }
          },
          thoughtSignature: ''
        })
      })

      it('应抛出不支持的 thinking 内容错误', () => {
        const requestWithThinking = new UnifiedRequestAst()
        requestWithThinking.model = 'gemini-pro'
        requestWithThinking.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Internal reasoning' }
            ]
          }
        ]

        expect(() => transformer.transform(requestWithThinking)).toThrow('Unsupported content type: thinking')
      })

      it('应正确转换工具为 functionDeclarations', () => {
        const googleRequest = transformer.transform(unifiedRequest)

        expect(googleRequest.tools).toBeDefined()
        expect(googleRequest.tools?.[0].functionDeclarations.length).toBe(1)
        expect(googleRequest.tools?.[0].functionDeclarations[0].name).toBe('get_weather')
        expect(googleRequest.tools?.[0].functionDeclarations[0].parameters.type).toBe('object')
      })
    })
  })
})
