/**
 * @fileoverview 内容块缓冲与最终化工具
 * @description 提供内容块列表的追加、聚合与最终化函数
 * @version 2.0
 */

import { UnifiedResponseAst } from '../ast';
import type { UnifiedContent } from '../ast';
import type { UnifiedResponseAccumulator } from './stream-aggregator-types';

/**
 * 创建空的统一响应
 * @returns 空的统一响应
 */
export function createEmptyUnifiedResponse(): UnifiedResponseAccumulator {
  const unified = new UnifiedResponseAst();
  unified.role = 'assistant';
  unified.content = [];
  (unified as any)._contentBlocks = [];
  return unified as UnifiedResponseAccumulator;
}

/**
 * 最终化内容块
 * @param acc 累积的统一响应
 * @returns 最终的统一响应
 */
export function finalizeContentBlocks(acc: UnifiedResponseAccumulator): UnifiedResponseAst {
  // 过滤空内容块并复制到 content 字段
  acc.content = acc._contentBlocks.filter((block) => {
    if (block.type === 'text') {
      return block.text && block.text.length > 0;
    }
    if (block.type === 'thinking') {
      return block.thinking && block.thinking.length > 0;
    }
    return true; // 保留 tool_use 等其他类型
  });

  // 清理内部字段
  delete (acc as any)._contentBlocks;

  return acc;
}

/**
 * 向内容块列表追加文本
 * @param contentBlocks 内容块列表
 * @param text 追加的文本
 */
export function appendTextToContent(contentBlocks: UnifiedContent[], text: string): void {
  const lastBlock = contentBlocks[contentBlocks.length - 1];
  if (lastBlock && lastBlock.type === 'text') {
    lastBlock.text += text;
  } else {
    contentBlocks.push({
      type: 'text',
      text
    });
  }
}

/**
 * 向内容块列表追加思考内容
 * @param contentBlocks 内容块列表
 * @param thinking 追加的思考内容
 */
export function appendThinkingToContent(
  contentBlocks: UnifiedContent[],
  thinking: string
): void {
  const lastBlock = contentBlocks[contentBlocks.length - 1];
  if (lastBlock && lastBlock.type === 'thinking') {
    lastBlock.thinking += thinking;
  } else {
    contentBlocks.push({
      type: 'thinking',
      thinking
    });
  }
}

/**
 * 聚合 OpenAI tool_calls（增量拼接）
 * @param contentBlocks 内容块列表
 * @param toolCalls 工具调用数组
 */
export function aggregateOpenAiToolCalls(
  contentBlocks: UnifiedContent[],
  toolCalls: any[]
): void {
  for (const tc of toolCalls) {
    // 查找已存在的 tool_use 块
    const existingBlock = contentBlocks.find(
      (block) => block.type === 'tool_use' && block.id === tc.id
    ) as any;

    if (existingBlock) {
      // 更新已存在的块
      if (tc.function?.name && !existingBlock.name) {
        existingBlock.name = tc.function.name;
      }
      if (tc.function?.arguments) {
        // 尝试解析 arguments 并合并
        try {
          const inputObj = JSON.parse(tc.function.arguments);
          existingBlock.input = { ...existingBlock.input, ...inputObj };
        } catch (_error) {
          // 如果解析失败，追加到 _partialJson
          existingBlock.input = {
            ...existingBlock.input,
            _partialJson: (existingBlock.input?._partialJson || '') + tc.function.arguments
          };
        }
      }
    } else {
      // 创建新的 tool_use 块
      let input: Record<string, unknown> = {};
      if (tc.function?.arguments) {
        try {
          input = JSON.parse(tc.function.arguments);
        } catch (_error) {
          input = { _partialJson: tc.function.arguments };
        }
      }

      const toolUseContent: UnifiedContent = {
        type: 'tool_use',
        id: tc.id || `tool_${Date.now()}_${contentBlocks.length}`,
        name: tc.function?.name || '',
        input
      };
      contentBlocks.push(toolUseContent);
    }
  }
}
