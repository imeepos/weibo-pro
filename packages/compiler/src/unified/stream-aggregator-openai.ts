/**
 * @fileoverview OpenAI 流式事件聚合
 * @description 将 OpenAI 流式响应 AST 聚合进统一累积响应
 * @version 2.0
 */

import type { OpenAiResponseAst } from '../ast';
import type { UnifiedResponseAccumulator } from './stream-aggregator-types';
import {
  appendTextToContent,
  appendThinkingToContent,
  aggregateOpenAiToolCalls
} from './stream-aggregator-content';
import { transformOpenAiUsage, mapOpenAiStopReason } from './stream-aggregator-transform';

/**
 * OpenAI 流式事件聚合
 * @param acc 累积的统一响应
 * @param ast OpenAI 响应 AST
 * @returns 更新后的统一响应
 */
export function aggregateOpenAiEvents(
  acc: UnifiedResponseAccumulator,
  ast: OpenAiResponseAst
): UnifiedResponseAccumulator {
  // 保留原始信息
  acc._provider = 'openai';
  acc._original = ast;
  acc._openai = {
    object: ast.object,
    created: ast.created,
    system_fingerprint: ast.system_fingerprint
  };

  // 基本字段
  if (!acc.id && ast.id) acc.id = ast.id;
  if (!acc.model && ast.model) acc.model = ast.model;
  if (ast.usage) acc.usage = transformOpenAiUsage(ast.usage);

  const choice = ast.choices?.[0];
  if (!choice) return acc;

  // 停止原因
  if (choice.finish_reason) {
    acc.stopReason = mapOpenAiStopReason(choice.finish_reason);
  }

  const delta = choice.delta;
  if (!delta) return acc;

  // 角色
  if (!acc.role && delta.role) acc.role = 'assistant';

  // 文本内容增量
  if (delta.content) {
    appendTextToContent(acc._contentBlocks, delta.content);
  }

  // reasoning_content (OpenAI 思考内容)
  if (delta.reasoning_content) {
    appendThinkingToContent(acc._contentBlocks, delta.reasoning_content);
  }

  // tool_calls 增量聚合
  if (delta.tool_calls) {
    aggregateOpenAiToolCalls(acc._contentBlocks, delta.tool_calls);
  }

  return acc;
}
