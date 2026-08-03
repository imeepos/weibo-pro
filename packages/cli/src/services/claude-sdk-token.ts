/**
 * Claude SDK Token 工具 - Token 预算提取
 */

import type { TokenBudgetData, ModelUsage } from '../types/index.js';

/**
 * 提取 Token 预算信息
 */
export function extractTokenBudget(resultMessage: Record<string, unknown>): TokenBudgetData | null {
  if (resultMessage.type !== 'result' || !resultMessage.modelUsage) {
    return null;
  }

  const modelUsage = resultMessage.modelUsage as Record<string, ModelUsage>;
  const modelKeys = Object.keys(modelUsage);
  if (modelKeys.length === 0) {
    return null;
  }
  const modelKey = modelKeys[0]!;
  const modelData = modelUsage[modelKey];

  if (!modelData) {
    return null;
  }

  const input = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
  const output = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;
  const cacheRead = modelData.cumulativeCacheReadInputTokens || modelData.cacheReadInputTokens || 0;
  const cacheCreation = modelData.cumulativeCacheCreationInputTokens || modelData.cacheCreationInputTokens || 0;

  // 计算单次请求的总 token 使用量（input 包含了 cache，不应重复计算）
  const used = input + output;
  const total = parseInt(process.env.CONTEXT_WINDOW || '160000', 10);

  console.log(`[ClaudeSdkService] Token 使用: input=${input}, output=${output}, cache=${cacheRead + cacheCreation}, total=${used}/${total}`);

  return { used, total, input, output, cacheRead, cacheCreation };
}
