/**
 * @fileoverview Google 流式事件聚合
 * @description 将 Google 流式响应 AST 聚合进统一累积响应
 * @version 2.0
 */

import type { GoogleResponseAst, UnifiedContent } from '../ast';
import type { UnifiedResponseAccumulator } from './stream-aggregator-types';
import { appendTextToContent } from './stream-aggregator-content';
import { transformGoogleUsage } from './stream-aggregator-transform';

/**
 * Google 流式事件聚合
 * @param acc 累积的统一响应
 * @param ast Google 响应 AST
 * @returns 更新后的统一响应
 */
export function aggregateGoogleEvents(
  acc: UnifiedResponseAccumulator,
  ast: GoogleResponseAst
): UnifiedResponseAccumulator {
  // 保留原始信息
  acc._provider = 'google';
  acc._original = ast;
  acc._google = {
    modelVersion: ast.modelVersion
  };

  // 基本字段
  if (!acc.model) acc.model = ast.modelVersion;
  acc.role = 'assistant';

  // 使用量
  if (ast.usageMetadata) {
    acc.usage = transformGoogleUsage(ast.usageMetadata);
  }

  // 内容聚合
  const candidate = ast.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      // 文本部分
      if ('text' in part) {
        appendTextToContent(acc._contentBlocks, part.text);
      }
      // 函数调用部分
      else if ('functionCall' in part) {
        const toolUseContent: UnifiedContent = {
          type: 'tool_use',
          id: `google_fc_${Date.now()}_${acc._contentBlocks.length}`,
          name: part.functionCall.name,
          input: part.functionCall.args as Record<string, unknown>
        };
        acc._contentBlocks.push(toolUseContent);
      }
    }
  }

  return acc;
}
