/**
 * @fileoverview 统一抽象层 - Anthropic 响应转换器
 * @description 将 Anthropic API 响应格式转换为统一格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  AnthropicResponseAst,
  AnthropicContentBlock,
  AnthropicUsage as AnthropicUsageType
} from '../ast';

/**
 * Anthropic 响应转换器
 * 将 Anthropic API 响应格式转换为统一格式
 */
export class AnthropicToUnifiedTransformer {
  /**
   * 转换 Anthropic 响应为统一响应
   * @param ast Anthropic 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: AnthropicResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();

    // 基本字段转换
    unified.id = ast.id;
    unified.model = ast.model;
    unified.role = 'assistant';
    unified.stopReason = this.mapStopReason(ast.stop_reason);
    unified._provider = 'anthropic';
    unified._original = ast;

    // 内容块转换
    unified.content = ast.content.map((block, index) =>
      this.transformContentBlock(block, index)
    );

    // Usage 转换
    unified.usage = this.transformUsage(ast.usage);

    // 保留 Anthropic 特有字段
    unified._anthropic = {
      stop_sequence: ast.stop_sequence,
      type: ast.type
    };

    return unified;
  }

  /**
   * 转换 Anthropic 内容块为统一内容块
   * @param block Anthropic 内容块
   * @param index 块索引（用于错误追踪）
   * @returns 统一内容块
   */
  private transformContentBlock(block: AnthropicContentBlock, index: number): UnifiedContent {
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
          signature: (block as any).signature
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
          toolUseId: (block as any).tool_use_id,
          content: (block as any).content,
          isError: (block as any).is_error
        };

      default:
        throw new Error(`Unknown Anthropic content block type: ${(block as any).type} at index ${index}`);
    }
  }

  /**
   * 转换 Anthropic Usage 为统一 Usage
   * @param usage Anthropic 使用量统计
   * @returns 统一使用量统计
   */
  private transformUsage(usage: AnthropicUsageType): UnifiedUsage {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens
    };
  }

  /**
   * 映射 Anthropic 停止原因到统一停止原因
   * @param reason Anthropic 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason: string): UnifiedStopReason {
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
}
