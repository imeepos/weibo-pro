/**
 * @fileoverview 统一抽象层测试工具与共享 fixtures
 * @description 供 unified 各测试文件复用的辅助函数与 mock 数据
 * @version 2.0
 */

import { Ast } from '../ast'
import { UnifiedRequestAst, UnifiedResponseAst } from '../ast'

// 辅助函数：创建 OpenAI 响应 AST 实例
export const _createOpenAiResponseAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// 辅助函数：创建 Anthropic 消息开始 AST 实例
export const _createAnthropicMessageStartAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// 辅助函数：创建 Anthropic 内容块开始 AST 实例
export const _createAnthropicContentBlockStartAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// 辅助函数：创建 Anthropic 内容块增量 AST 实例
export const _createAnthropicContentBlockDeltaAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// 辅助函数：创建 Anthropic 消息增量 AST 实例
export const _createAnthropicMessageDeltaAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// 辅助函数：创建 Google 响应 AST 实例
export const _createGoogleResponseAst = (data: any) => {
  const ast = Object.create((class extends Ast { visit(): any {} }).prototype)
  Object.assign(ast, data)
  return ast
}

// ==================== Request 转换测试共享 fixture ====================
// 创建统一的请求 AST
export function createUnifiedRequest(): UnifiedRequestAst {
  const unifiedRequest = new UnifiedRequestAst()
  unifiedRequest.model = 'claude-3-sonnet'
  unifiedRequest.maxTokens = 1024
  unifiedRequest.temperature = 0.7
  unifiedRequest.system = 'You are a helpful assistant.'
  unifiedRequest.messages = [
    {
      role: 'user',
      content: 'Hello'
    }
  ]
  unifiedRequest.tools = [
    {
      name: 'get_weather',
      description: 'Get weather information',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称' }
        },
        required: ['city']
      }
    }
  ]
  return unifiedRequest
}

// ==================== Response 转换测试共享 fixture ====================
// 创建 Anthropic 响应示例
export function createAnthropicResponse(): any {
  return {
    id: 'msg_123',
    type: 'message',
    role: 'assistant',
    model: 'claude-3-sonnet',
    content: [
      { type: 'text', text: 'Hello' },
      { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
      {
        type: 'tool_use',
        id: 'tool_1',
        name: 'get_weather',
        input: { city: 'Beijing' }
      }
    ],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50
    }
  }
}

// 创建 OpenAI 响应示例
export function createOpenAIResponse(): any {
  return {
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
          reasoning_content: 'Let me reason',
          tool_calls: [
            {
              index: 0,
              id: 'tool_1',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"city":"Beijing"}'
              }
            }
          ]
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
}

// 创建 Google 响应示例
export function createGoogleResponse(): any {
  return {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [
            { text: 'Hello' },
            {
              functionCall: {
                name: 'get_weather',
                args: { city: 'Beijing' }
              }
            }
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
}

// 创建统一的响应 AST（Response 转换测试用）
export function createUnifiedResponse(): UnifiedResponseAst {
  const unifiedResponse = new UnifiedResponseAst()
  unifiedResponse.id = 'msg_123'
  unifiedResponse.model = 'claude-3-sonnet'
  unifiedResponse.role = 'assistant'
  unifiedResponse.content = [
    { type: 'text', text: 'Hello' },
    { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
    {
      type: 'tool_use',
      id: 'tool_1',
      name: 'get_weather',
      input: { city: 'Beijing' }
    }
  ]
  unifiedResponse.stopReason = 'end_turn'
  unifiedResponse.usage = {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150
  }
  return unifiedResponse
}

// ==================== 无损转换测试共享 fixture ====================
// 创建统一的响应 AST（无损转换测试用）
export function createReverseUnifiedResponse(): UnifiedResponseAst {
  const unifiedResponse = new UnifiedResponseAst()
  unifiedResponse.id = 'msg_123'
  unifiedResponse.model = 'claude-3-sonnet'
  unifiedResponse.role = 'assistant'
  unifiedResponse.content = [
    { type: 'text', text: 'Hello World' },
    { type: 'thinking', thinking: 'Let me think', signature: 'sig123' }
  ]
  unifiedResponse.usage = {
    inputTokens: 100,
    outputTokens: 50
  }
  return unifiedResponse
}
