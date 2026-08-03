/**
 * @fileoverview 统一抽象层 - 反向转换 Anthropic
 * @description 将 UnifiedResponseAst 转换回 Anthropic 原始格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  AnthropicResponseAst,
  AnthropicContentBlock,
  AnthropicUsage
} from '../ast';

/**
 * 将 Unified 响应转换为 Anthropic 响应格式
 * @param unified 统一响应 AST
 * @returns Anthropic 响应 AST
 */
export function toAnthropicResponse(unified: UnifiedResponseAst): AnthropicResponseAst {
  const ast = new AnthropicResponseAst();

  // 基本字段
  ast.id = unified.id || '';
  ast.model = unified.model || '';
  ast.role = 'assistant';
  ast.type = unified._anthropic?.type || 'message';

  // 内容转换
  ast.content = unified.content.map((block, index) =>
    transformContentBlock(block, index)
  );

  // 停止原因映射
  ast.stop_reason = mapStopReasonToAnthropic(unified.stopReason);
  ast.stop_sequence = unified._anthropic?.stop_sequence || null;

  // Usage 转换
  if (unified.usage) {
    ast.usage = transformUsageToAnthropic(unified.usage);
  }

  return ast;
}

/**
 * 转换统一内容块为 Anthropic 内容块
 * @param block 统一内容块
 * @param index 块索引
 * @returns Anthropic 内容块
 */
export function transformContentBlock(block: UnifiedContent, index: number): AnthropicContentBlock {
  switch (block.type) {
    case 'text':
      return {
        type: 'text',
        text: (block as any).text
      };

    case 'thinking':
      return {
        type: 'thinking',
        thinking: (block as any).thinking,
        signature: (block as any).signature || ''
      };

    case 'tool_use':
      return {
        type: 'tool_use',
        id: (block as any).id,
        name: (block as any).name,
        input: (block as any).input
      };

    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: (block as any).toolUseId,
        content: (block as any).content,
        is_error: (block as any).isError
      };

    default:
      throw new Error(`Unknown unified content type: ${(block as any).type} at index ${index}`);
  }
}

/**
 * 转换统一 Usage 为 Anthropic Usage
 * @param usage 统一使用量统计
 * @returns Anthropic 使用量统计
 */
export function transformUsageToAnthropic(usage: UnifiedUsage): AnthropicUsage {
  return {
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens
  };
}

/**
 * 映射统一停止原因到 Anthropic 停止原因
 * @param reason 统一停止原因
 * @returns Anthropic 停止原因
 */
export function mapStopReasonToAnthropic(reason?: UnifiedStopReason): string {
  switch (reason) {
    case 'end_turn':
      return 'end_turn';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    case 'stop_sequence':
      return 'stop_sequence';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'end_turn';
  }
}
