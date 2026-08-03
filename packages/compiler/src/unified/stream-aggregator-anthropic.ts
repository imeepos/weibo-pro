/**
 * @fileoverview Anthropic 流式事件聚合
 * @description 将 Anthropic 流式响应 AST 聚合进统一累积响应
 * @version 2.0
 */

import type {
  AnthropicMessageStartAst,
  AnthropicContentBlockStartAst,
  AnthropicContentBlockDeltaAst,
  AnthropicMessageDeltaAst,
  UnifiedContent
} from '../ast';
import type { UnifiedResponseAccumulator } from './stream-aggregator-types';
import { transformAnthropicUsage, mapAnthropicStopReason } from './stream-aggregator-transform';

/**
 * Anthropic message_start 事件聚合
 * @param acc 累积的统一响应
 * @param ast Anthropic message_start 事件
 * @returns 更新后的统一响应
 */
export function aggregateAnthropicEvents(
  acc: UnifiedResponseAccumulator,
  ast: AnthropicMessageStartAst
): UnifiedResponseAccumulator {
  // 保留原始信息
  acc._provider = 'anthropic';
  acc._original = ast;
  acc._anthropic = {
    type: ast.type
  };

  // 基本字段
  acc.id = ast.message.id;
  acc.model = ast.message.model;
  acc.role = ast.message.role || 'assistant';
  if (ast.message.usage) {
    acc.usage = transformAnthropicUsage(ast.message.usage);
  }

  return acc;
}

/**
 * Anthropic content_block_start 事件聚合
 * @param acc 累积的统一响应
 * @param ast Anthropic content_block_start 事件
 * @returns 更新后的统一响应
 */
export function aggregateAnthropicContentBlockStart(
  acc: UnifiedResponseAccumulator,
  ast: AnthropicContentBlockStartAst
): UnifiedResponseAccumulator {
  const block = ast.content_block;
  let contentBlock: UnifiedContent;

  switch (block.type) {
    case 'text':
      contentBlock = {
        type: 'text',
        text: (block as any).text || ''
      };
      break;

    case 'thinking':
      contentBlock = {
        type: 'thinking',
        thinking: (block as any).thinking || '',
        signature: (block as any).signature || ''
      };
      break;

    case 'tool_use':
      contentBlock = {
        type: 'tool_use',
        id: (block as any).id,
        name: (block as any).name,
        input: (block as any).input || {}
      };
      break;

    default:
      // 跳过未知类型
      return acc;
  }

  acc._contentBlocks[ast.index] = contentBlock;
  return acc;
}

/**
 * Anthropic content_block_delta 事件聚合
 * @param acc 累积的统一响应
 * @param ast Anthropic content_block_delta 事件
 * @returns 更新后的统一响应
 */
export function aggregateAnthropicContentBlockDelta(
  acc: UnifiedResponseAccumulator,
  ast: AnthropicContentBlockDeltaAst
): UnifiedResponseAccumulator {
  const block = acc._contentBlocks[ast.index];
  if (!block) return acc;

  const delta = ast.delta;

  // 文本增量
  if (delta.type === 'text_delta' && (delta as any).text) {
    if (block.type === 'text') {
      block.text += (delta as any).text;
    }
  }
  // 思考增量
  else if (delta.type === 'thinking_delta' && (delta as any).thinking) {
    if (block.type === 'thinking') {
      block.thinking += (delta as any).thinking;
    }
  }
  // 签名增量
  else if (delta.type === 'signature_delta' && (delta as any).signature) {
    if (block.type === 'thinking') {
      block.signature = (block.signature || '') + (delta as any).signature;
    }
  }
  // input_json 增量（工具参数）
  else if (delta.type === 'input_json_delta' && (delta as any).partial_json !== undefined) {
    if (block.type === 'tool_use') {
      const partialJson = (delta as any).partial_json;
      // 尝试解析并合并参数
      try {
        const inputObj = JSON.parse(partialJson);
        block.input = { ...block.input, ...inputObj };
      } catch (_error) {
        // 如果解析失败，保留原始字符串
        block.input = { ...block.input, _partialJson: partialJson };
      }
    }
  }

  return acc;
}

/**
 * Anthropic message_delta 事件聚合
 * @param acc 累积的统一响应
 * @param ast Anthropic message_delta 事件
 * @returns 更新后的统一响应
 */
export function aggregateAnthropicMessageDelta(
  acc: UnifiedResponseAccumulator,
  ast: AnthropicMessageDeltaAst
): UnifiedResponseAccumulator {
  // 停止原因
  if (ast.delta?.stop_reason) {
    acc.stopReason = mapAnthropicStopReason(ast.delta.stop_reason);
  }

  // 使用量
  if (ast.usage) {
    if (!acc.usage) {
      acc.usage = transformAnthropicUsage(ast.usage);
    } else {
      acc.usage.outputTokens = ast.usage.output_tokens;
      acc.usage.totalTokens = (acc.usage.inputTokens || 0) + ast.usage.output_tokens;
    }
  }

  return acc;
}
