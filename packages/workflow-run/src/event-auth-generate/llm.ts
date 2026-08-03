import { parse as parseWithHarmony } from '@sker/json-harmony';
import type { LLMGeneratedEvent } from './types';

/**
 * 构建用户提示词
 */
export function buildUserPrompt(userInputData: Record<string, any>): string {
  const formattedInput = JSON.stringify(userInputData, null, 2);

  return `请根据以下用户提供的信息，生成符合数据库结构的事件记录：

## 用户输入

${formattedInput}

## 任务要求

1. 分析用户输入，提取关键信息
2. **时间提取**：从用户输入中提取事件发生时间（如 onboard_time、time、created_at 等字段），作为 occurred_at
3. 合理推断缺失的字段（如 description, sentiment, hotness 等）
4. 从可用分类列表中选择最合适的 category_id
5. 判断是否应该生成新事件（检查是否与现有事件高度相似）
6. 返回完整的 JSON 格式事件记录

请开始处理：`;
}

/**
 * 解析 LLM 响应
 */
export function parseLLMResponse(responseContent: string): LLMGeneratedEvent {
  // 使用 json-harmony 解析（容错性强）
  const parseResult = parseWithHarmony(responseContent);

  if (typeof parseResult.data !== 'object' || parseResult.data === null) {
    console.error('[EventAuthGenerateAstVisitor] JSON 解析失败，原始文本:');
    console.error(responseContent);
    throw new Error('LLM 返回的 JSON 格式无效');
  }

  return parseResult.data as LLMGeneratedEvent;
}
