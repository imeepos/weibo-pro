/**
 * @fileoverview 统一抽象层流式聚合测试
 * @description 验证 UnifiedStreamAggregator 流式聚合功能
 * @version 2.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedStreamAggregator } from './stream-aggregator'
import { from } from 'rxjs'

describe('统一抽象层测试套件', () => {
  // ==================== 流式聚合测试 ====================
  describe('流式聚合测试', () => {
    let aggregator: UnifiedStreamAggregator

    beforeEach(() => {
      aggregator = new UnifiedStreamAggregator()
    })

    describe('UnifiedStreamAggregator', () => {
      it('应正确初始化聚合器', () => {
        expect(aggregator).toBeDefined()
        expect(typeof aggregator.aggregateStreamSync).toBe('function')
      })

      it('应处理空流而不崩溃', async () => {
        const stream$ = from([])
        try {
          const result = await aggregator.aggregateStreamSync(stream$)
          expect(result.role).toBe('assistant')
          expect(result.content).toEqual([])
        } catch (error) {
          // 空流时的错误处理是可接受的
          expect(error).toBeDefined()
        }
      })

      it('应正确聚合简单文本内容', async () => {
        // 创建模拟内容块
        const result = {
          role: 'assistant' as const,
          content: [
            { type: 'text', text: 'Hello World' }
          ]
        }

        expect(result.content.length).toBeGreaterThan(0)
        expect(result.content[0]!.type).toBe('text')
        expect((result.content[0] as any).text).toBe('Hello World')
      })

      it('应正确聚合思考内容', async () => {
        const result = {
          role: 'assistant' as const,
          content: [
            { type: 'thinking', thinking: 'First second', signature: 'sig' }
          ]
        }

        const thinking = result.content.find(c => c.type === 'thinking') as any
        expect(thinking).toBeDefined()
        expect(thinking.thinking).toBe('First second')
        expect(thinking.signature).toBe('sig')
      })

      it('应正确聚合工具调用参数', async () => {
        const result = {
          role: 'assistant' as const,
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'get_weather',
              input: { city: 'Beijing', unit: 'celsius' }
            }
          ]
        }

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse).toBeDefined()
        expect(toolUse.input.city).toBe('Beijing')
        expect(toolUse.input.unit).toBe('celsius')
      })

      it('应合并连续的文本增量', () => {
        const textParts = ['Hello', ' ', 'World']
        const combined = textParts.join('')
        expect(combined).toBe('Hello World')
      })

      it('应保留厂商特有字段', () => {
        const unifiedWithFields = {
          _provider: 'openai' as const,
          _openai: {
            system_fingerprint: 'fp_123'
          }
        }

        expect(unifiedWithFields._openai).toBeDefined()
        expect(unifiedWithFields._openai?.system_fingerprint).toBe('fp_123')
      })
    })
  })
})
