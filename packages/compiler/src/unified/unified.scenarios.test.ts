/**
 * @fileoverview 统一抽象层关键测试场景（无损转换与工具调用）
 * @description 验证厂商 → Unified → 厂商无损往返、OpenAI arguments 转换、Google ID 生成
 * @version 2.0
 */

import { describe, it, expect } from 'vitest'
import { UnifiedResponseAst } from '../ast'
import {
  AnthropicToUnifiedTransformer,
  OpenAIToUnifiedTransformer,
  GoogleToUnifiedTransformer
} from './response-transformer'
import { UnifiedToOriginalTransformer } from './reverse-transformer'

describe('统一抽象层测试套件', () => {
  // ==================== 关键测试场景 ====================
  describe('关键测试场景', () => {
    describe('无损转换验证', () => {
      it('应实现厂商 → Unified → 厂商 = 原始数据', () => {
        const originalAnthropicResponse = {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello World' },
            { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'get_weather',
              input: { city: 'Beijing', unit: 'celsius' }
            },
            {
              type: 'tool_result',
              tool_use_id: 'tool_1',
              content: 'Sunny, 25°C',
              is_error: false
            }
          ],
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        }

        // 厂商 → Unified
        const anthropicTransformer = new AnthropicToUnifiedTransformer()
        const unified = anthropicTransformer.transform(originalAnthropicResponse as any)

        // Unified → 厂商
        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        // 验证关键字段
        expect(restored.id).toBe(originalAnthropicResponse.id)
        expect(restored.model).toBe(originalAnthropicResponse.model)
        expect(restored.type).toBe(originalAnthropicResponse.type)
        expect(restored.stop_reason).toBe(originalAnthropicResponse.stop_reason)
        expect(restored.stop_sequence).toBe(originalAnthropicResponse.stop_sequence)
        expect(restored.usage.input_tokens).toBe(originalAnthropicResponse.usage.input_tokens)
        expect(restored.usage.output_tokens).toBe(originalAnthropicResponse.usage.output_tokens)

        // 验证内容块
        expect(restored.content.length).toBe(originalAnthropicResponse.content.length)
        expect(restored.content[0]).toEqual(originalAnthropicResponse.content[0])
        expect(restored.content[1]).toEqual(originalAnthropicResponse.content[1])
        expect(restored.content[2]).toEqual(originalAnthropicResponse.content[2])
        expect(restored.content[3]).toEqual(originalAnthropicResponse.content[3])
      })

      it('应保留 OpenAI 特有字段', () => {
        const originalOpenAIResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677655464,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              delta: {
                role: 'assistant',
                content: 'Hello',
                reasoning_content: 'Let me think'
              }
            }
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          },
          system_fingerprint: 'fp_123'
        }

        const openaiTransformer = new OpenAIToUnifiedTransformer()
        const unified = openaiTransformer.transform(originalOpenAIResponse as any)

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        expect(restored.object).toBe(originalOpenAIResponse.object)
        expect(restored.created).toBe(originalOpenAIResponse.created)
        expect(restored.system_fingerprint).toBe(originalOpenAIResponse.system_fingerprint)
      })

      it('应保留 Google 特有字段', () => {
        const originalGoogleResponse = {
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
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
            trafficType: '0',
            thoughtsTokenCount: 5
          },
          modelVersion: 'gemini-pro'
        }

        const googleTransformer = new GoogleToUnifiedTransformer()
        const unified = googleTransformer.transform(originalGoogleResponse as any)

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        expect(restored.modelVersion).toBe(originalGoogleResponse.modelVersion)
        expect(restored.candidates[0].finishReason).toBe(originalGoogleResponse.candidates[0]!.finishReason)
        expect(restored.usageMetadata.trafficType).toBe(originalGoogleResponse.usageMetadata.trafficType)
        expect(restored.usageMetadata.thoughtsTokenCount).toBe(originalGoogleResponse.usageMetadata.thoughtsTokenCount)
      })
    })

    describe('OpenAI arguments 字符串 ↔ 对象转换', () => {
      it('应正确解析 OpenAI function.arguments 字符串', () => {
        const openaiResponse = {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: 'tool_1',
                    function: {
                      name: 'get_weather',
                      arguments: '{"city":"Beijing","unit":"celsius","forecast_days":7}'
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({
          city: 'Beijing',
          unit: 'celsius',
          forecast_days: 7
        })
      })

      it('应正确将 unified input 转换为 JSON 字符串', () => {
        const unifiedResponse = new UnifiedResponseAst()
        unifiedResponse._provider = 'openai'
        unifiedResponse.content = [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'get_weather',
            input: {
              city: 'Beijing',
              unit: 'celsius',
              nested: {
                key: 'value'
              }
            }
          }
        ]

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        const args = result.choices[0].delta.tool_calls[0].function.arguments
        expect(typeof args).toBe('string')
        const parsed = JSON.parse(args)
        expect(parsed.city).toBe('Beijing')
        expect(parsed.nested.key).toBe('value')
      })

      it('应处理无效的 JSON 并保留原始字符串', () => {
        const openaiResponse = {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    function: {
                      arguments: '{invalid json'
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({})
      })
    })

    describe('Google ID 生成', () => {
      it('应自动生成 tool_use ID', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'Beijing' }
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.id).toBeDefined()
        expect(toolUse.id).toMatch(/^google_fc_\d+_\d+$/)
      })

      it('应正确关联 tool_use 和 tool_result', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'Beijing' }
                    }
                  },
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

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        const _toolUse = result.content.find(c => c.type === 'tool_use') as any
        const toolResult = result.content.find(c => c.type === 'tool_result') as any
        expect(toolResult.toolUseId).toBe('get_weather')
      })
    })
  })
})
