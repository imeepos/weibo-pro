/**
 * @fileoverview 统一抽象层关键测试场景（厂商字段保留与错误处理）
 * @description 验证各厂商特有字段的保留以及错误处理逻辑
 * @version 2.0
 */

import { describe, it, expect } from 'vitest'
import { UnifiedRequestAst, UnifiedResponseAst } from '../ast'
import {
  UnifiedToAnthropicTransformer,
  UnifiedToGoogleTransformer
} from './request-transformer'
import {
  AnthropicToUnifiedTransformer,
  OpenAIToUnifiedTransformer,
  GoogleToUnifiedTransformer
} from './response-transformer'
import { UnifiedToOriginalTransformer } from './reverse-transformer'

describe('统一抽象层测试套件', () => {
  // ==================== 关键测试场景 ====================
  describe('关键测试场景', () => {
    describe('厂商特有字段保留', () => {
      it('应完整保留 Anthropic 特有字段', () => {
        const anthropicResponse = {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello' }
          ],
          stop_reason: 'end_turn',
          stop_sequence: 'STOP',
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        }

        const transformer = new AnthropicToUnifiedTransformer()
        const result = transformer.transform(anthropicResponse as any)

        expect(result._provider).toBe('anthropic')
        expect(result._anthropic).toBeDefined()
        expect(result._anthropic?.type).toBe('message')
        expect(result._anthropic?.stop_sequence).toBe('STOP')
        expect(result._original).toBe(anthropicResponse)
      })

      it('应完整保留 OpenAI 特有字段', () => {
        const openaiResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677655464,
          model: 'gpt-4',
          choices: [
            {
              delta: { content: 'Hello' }
            }
          ],
          system_fingerprint: 'fp_123'
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        expect(result._provider).toBe('openai')
        expect(result._openai).toBeDefined()
        expect(result._openai?.object).toBe('chat.completion')
        expect(result._openai?.created).toBe(1677655464)
        expect(result._openai?.system_fingerprint).toBe('fp_123')
        expect(result._original).toBe(openaiResponse)
      })

      it('应完整保留 Google 特有字段', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Hello' }
                ]
              },
              finishReason: 'STOP'
            }
          ],
          modelVersion: 'gemini-pro'
        }

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        expect(result._provider).toBe('google')
        expect(result._google).toBeDefined()
        expect(result._google?.modelVersion).toBe('gemini-pro')
        expect(result._original).toBe(googleResponse)
      })
    })

    describe('错误处理', () => {
      it('应处理不支持的内容类型', () => {
        const unifiedRequest = new UnifiedRequestAst()
        unifiedRequest.model = 'claude-3'
        unifiedRequest.messages = [
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

        const transformer = new UnifiedToAnthropicTransformer()
        expect(() => transformer.transform(unifiedRequest)).toThrow('Unsupported content type: image')
      })

      it('应处理未知提供商', () => {
        const unifiedResponse = new UnifiedResponseAst()
        unifiedResponse._original = undefined

        const transformer = new UnifiedToOriginalTransformer()
        expect(() => transformer.toOriginal(unifiedResponse)).toThrow('Unknown provider')
      })

      it('应处理 Google 不支持的 thinking 内容', () => {
        const unifiedRequest = new UnifiedRequestAst()
        unifiedRequest.model = 'gemini-pro'
        unifiedRequest.messages = [
          {
            role: 'assistant',
            content: [
              {
                type: 'thinking',
                thinking: 'Let me think'
              }
            ]
          }
        ]

        const transformer = new UnifiedToGoogleTransformer()
        expect(() => transformer.transform(unifiedRequest)).toThrow('Unsupported content type: thinking')
      })
    })
  })
})
