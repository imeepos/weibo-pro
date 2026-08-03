/**
 * @fileoverview 统一抽象层 - OpenAI 请求转换器
 * @description 将 UnifiedRequestAst 转换为 OpenAI API 请求格式
 * @version 2.0
 */

import { UnifiedRequestAst, UnifiedMessage, UnifiedTool } from '../ast';
import {
  OpenAIRequestAst,
  OpenAIRequestMessage,
  OpenAIRequestRole,
  OpenAITool
} from '../ast';

/**
 * OpenAI 请求转换器
 * 将统一格式转换为 OpenAI API 请求格式
 */
export class UnifiedToOpenAITransformer {
  /**
   * 转换统一请求为 OpenAI 请求
   * @param unified 统一请求 AST
   * @returns OpenAI 请求 AST
   */
  transform(unified: UnifiedRequestAst): OpenAIRequestAst {
    const ast = new OpenAIRequestAst();

    ast.model = unified.model;
    ast.max_tokens = unified.maxTokens;
    ast.temperature = unified.temperature;
    ast.stream = unified.stream;

    // 消息转换
    ast.messages = unified.messages.map(m => this.transformMessage(m));

    // 如果有单独的 system，添加到开头
    if (unified.system && !unified.messages.some(m => m.role === 'system')) {
      ast.messages.unshift({ role: 'system', content: unified.system });
    }

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = unified.tools.map(t => this.transformTool(t));
    }

    return ast;
  }

  /**
   * 转换统一消息为 OpenAI 消息
   * @param msg 统一消息
   * @returns OpenAI 消息
   */
  private transformMessage(msg: UnifiedMessage): OpenAIRequestMessage {
    // OpenAI 的 tool_calls 需要特殊处理
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const toolUses = msg.content.filter((c: any) => c.type === 'tool_use');
      const textContent = msg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');

      if (toolUses.length > 0) {
        return {
          role: 'assistant',
          content: textContent,
          tool_calls: toolUses.map((tu: any, index: number) => ({
            index,
            id: tu.id,
            type: 'function',
            function: {
              name: tu.name,
              arguments: JSON.stringify(tu.input)  // OpenAI 需要 JSON 字符串
            }
          }))
        };
      }
    }

    // tool_result 转为 tool role
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      const toolResult = msg.content.find((c: any) => c.type === 'tool_result') as any;
      if (toolResult) {
        return {
          role: 'tool',
          content: toolResult.content,
          tool_call_id: toolResult.toolUseId
        };
      }
    }

    // 普通文本消息
    const content = typeof msg.content === 'string'
      ? msg.content
      : msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');

    return { role: msg.role as OpenAIRequestRole, content };
  }

  /**
   * 转换统一工具为 OpenAI 工具
   * @param tool 统一工具
   * @returns OpenAI 工具
   */
  private transformTool(tool: UnifiedTool): OpenAITool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  }
}
