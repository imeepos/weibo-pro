/**
 * @fileoverview 统一抽象层 - 反向转换 OpenAI
 * @description 将 UnifiedResponseAst 转换回 OpenAI 原始格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  OpenAiResponseAst,
  OpenAiChoice,
  OpenAiUsage
} from '../ast';

/**
 * 将 Unified 响应转换为 OpenAI 响应格式
 * @param unified 统一响应 AST
 * @returns OpenAI 响应 AST
 */
export function toOpenAIResponse(unified: UnifiedResponseAst): OpenAiResponseAst {
  const ast = new OpenAiResponseAst();

  // 基本字段
  ast.id = unified.id || '';
  ast.model = unified.model || '';
  ast.object = unified._openai?.object || 'chat.completion';
  ast.created = unified._openai?.created || Math.floor(Date.now() / 1000);
  ast.system_fingerprint = unified._openai?.system_fingerprint || '';

  // 内容转换到 choice.delta
  const choice: OpenAiChoice = {
    index: 0,
    finish_reason: mapStopReasonToOpenAI(unified.stopReason),
    delta: transformContentToOpenAiDelta(unified.content)
  };

  ast.choices = [choice];

  // Usage 转换
  if (unified.usage) {
    ast.usage = transformUsageToOpenAI(unified.usage);
  }

  return ast;
}

/**
 * 转换统一内容为 OpenAI Delta 格式
 * @param content 统一内容数组
 * @returns OpenAI Delta
 */
export function transformContentToOpenAiDelta(content: UnifiedContent[]): any {
  const delta: any = {
    content: '',
    role: 'assistant',
    reasoning_content: null,
    tool_calls: []
  };

  // 合并文本内容
  const textContent = content
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('');
  if (textContent) {
    delta.content = textContent;
  }

  // 处理 thinking（转为 reasoning_content）
  const thinkingContent = content.find((c: any) => c.type === 'thinking');
  if (thinkingContent) {
    delta.reasoning_content = (thinkingContent as any).thinking;
  }

  // 处理 tool_use（转为 tool_calls）
  const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');
  if (toolUseBlocks.length > 0) {
    delta.tool_calls = toolUseBlocks.map((tu: any, index: number) => ({
      index,
      id: tu.id,
      type: 'function',
      function: {
        name: tu.name,
        arguments: JSON.stringify(tu.input)  // OpenAI 需要 JSON 字符串
      }
    }));
  }

  return delta;
}

/**
 * 转换统一 Usage 为 OpenAI Usage
 * @param usage 统一使用量统计
 * @returns OpenAI 使用量统计
 */
export function transformUsageToOpenAI(usage: UnifiedUsage): OpenAiUsage {
  return {
    prompt_tokens: usage.inputTokens,
    completion_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens || (usage.inputTokens + usage.outputTokens)
  };
}

/**
 * 映射统一停止原因到 OpenAI 停止原因
 * @param reason 统一停止原因
 * @returns OpenAI 停止原因
 */
export function mapStopReasonToOpenAI(reason?: UnifiedStopReason): string | null {
  switch (reason) {
    case 'end_turn':
      return 'stop';
    case 'tool_use':
      return 'tool_calls';
    case 'max_tokens':
      return 'length';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}
