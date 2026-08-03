/**
 * @fileoverview 统一抽象层 - OpenAI 响应转换器
 * @description 将 OpenAI API 响应格式转换为统一格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  OpenAiResponseAst,
  OpenAiChoice,
  OpenAiUsage as OpenAiUsageType
} from '../ast';

/**
 * OpenAI 响应转换器
 * 将 OpenAI API 响应格式转换为统一格式
 */
export class OpenAIToUnifiedTransformer {
  /**
   * 转换 OpenAI 响应为统一响应
   * @param ast OpenAI 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: OpenAiResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();
    const choice = ast.choices?.[0];

    // 基本字段转换
    unified.id = ast.id;
    unified.model = ast.model;
    unified.role = 'assistant';
    unified._provider = 'openai';
    unified._original = ast;

    // 内容转换
    unified.content = this.transformContent(choice);

    // 停止原因
    unified.stopReason = this.mapStopReason(choice?.finish_reason);

    // Usage
    if (ast.usage) {
      unified.usage = this.transformUsage(ast.usage);
    }

    // 保留 OpenAI 特有字段
    unified._openai = {
      object: ast.object,
      created: ast.created,
      system_fingerprint: ast.system_fingerprint
    };

    return unified;
  }

  /**
   * 转换 OpenAI Choice 的内容为统一内容
   * @param choice OpenAI 选择结果
   * @returns 统一内容块数组
   */
  private transformContent(choice?: OpenAiChoice): UnifiedContent[] {
    if (!choice?.delta) {
      return [];
    }

    const content: UnifiedContent[] = [];

    // 文本内容
    if (choice.delta.content) {
      content.push({
        type: 'text',
        text: choice.delta.content
      });
    }

    // reasoning_content (OpenAI 的思考内容)
    if (choice.delta.reasoning_content) {
      content.push({
        type: 'thinking',
        thinking: choice.delta.reasoning_content
      });
    }

    // tool_calls 转换
    if (choice.delta.tool_calls) {
      for (const tc of choice.delta.tool_calls) {
        // OpenAI 的 arguments 是 JSON 字符串，需要解析
        let input: Record<string, unknown> = {};
        if (tc.function?.arguments) {
          try {
            input = JSON.parse(tc.function.arguments);
          } catch (error) {
            console.error('Failed to parse OpenAI function arguments:', error);
          }
        }

        content.push({
          type: 'tool_use',
          id: tc.id ?? '',
          name: tc.function?.name ?? '',
          input
        });
      }
    }

    return content;
  }

  /**
   * 转换 OpenAI Usage 为统一 Usage
   * @param usage OpenAI 使用量统计
   * @returns 统一使用量统计
   */
  private transformUsage(usage: OpenAiUsageType): UnifiedUsage {
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    };
  }

  /**
   * 映射 OpenAI 停止原因到统一停止原因
   * @param reason OpenAI 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason: string | null | undefined): UnifiedStopReason {
    switch (reason) {
      case 'stop':
        return 'end_turn';
      case 'tool_calls':
        return 'tool_use';
      case 'length':
        return 'max_tokens';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'end_turn';
    }
  }
}
