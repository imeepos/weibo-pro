/**
 * @fileoverview 统一抽象层 - Anthropic 请求转换器
 * @description 将 UnifiedRequestAst 转换为 Anthropic API 请求格式
 * @version 2.0
 */

import { UnifiedRequestAst, UnifiedMessage, UnifiedTool } from '../ast';
import {
  AnthropicRequestAst,
  AnthropicRequestMessage,
  AnthropicContentBlock,
  AnthropicTool
} from '../ast';

/**
 * Anthropic 请求转换器
 * 将统一格式转换为 Anthropic API 请求格式
 */
export class UnifiedToAnthropicTransformer {
  /**
   * 转换统一请求为 Anthropic 请求
   * @param unified 统一请求 AST
   * @returns Anthropic 请求 AST
   */
  transform(unified: UnifiedRequestAst): AnthropicRequestAst {
    const ast = new AnthropicRequestAst();

    ast.model = unified.model;
    ast.max_tokens = unified.maxTokens ?? 4096;
    ast.system = unified.system;
    ast.temperature = unified.temperature;
    ast.stream = unified.stream;

    // 消息转换（过滤 system，单独处理）
    ast.messages = unified.messages
      .filter(m => m.role !== 'system')
      .map(m => this.transformMessage(m));

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = unified.tools.map(t => this.transformTool(t));
    }

    return ast;
  }

  /**
   * 转换统一消息为 Anthropic 消息
   * @param msg 统一消息
   * @returns Anthropic 消息
   */
  private transformMessage(msg: UnifiedMessage): AnthropicRequestMessage {
    const role = msg.role === 'tool' ? 'user' : msg.role as 'user' | 'assistant';

    if (typeof msg.content === 'string') {
      return { role, content: msg.content };
    }

    // 数组内容转换
    const content: AnthropicContentBlock[] = msg.content.map((c: any) => {
      switch (c.type) {
        case 'text':
          return { type: 'text', text: c.text };
        case 'thinking':
          return { type: 'thinking', thinking: c.thinking, signature: c.signature ?? '' };
        case 'tool_use':
          return { type: 'tool_use', id: c.id, name: c.name, input: c.input };
        case 'tool_result':
          return { type: 'tool_result', tool_use_id: c.toolUseId, content: c.content, is_error: c.isError };
        case 'image':
          throw new Error('Unsupported content type: image (not supported by Anthropic)');
        default:
          throw new Error(`Unsupported content type: ${(c as any).type}`);
      }
    });

    return { role, content };
  }

  /**
   * 转换统一工具为 Anthropic 工具
   * @param tool 统一工具
   * @returns Anthropic 工具
   */
  private transformTool(tool: UnifiedTool): AnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required
      }
    };
  }
}
