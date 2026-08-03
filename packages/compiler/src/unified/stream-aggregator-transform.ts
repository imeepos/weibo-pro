/**
 * @fileoverview Usage 与停止原因转换工具
 * @description 将各厂商的 Usage 与停止原因转换为统一格式
 * @version 2.0
 */

import type { UnifiedStopReason, UnifiedUsage } from '../ast';

/**
 * 转换 OpenAI Usage 为统一 Usage
 * @param usage OpenAI 使用量统计
 * @returns 统一使用量统计
 */
export function transformOpenAiUsage(usage: any): UnifiedUsage {
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    _openai: {
      prompt_tokens_details: usage.prompt_tokens_details,
      completion_tokens_details: usage.completion_tokens_details
    }
  };
}

/**
 * 转换 Anthropic Usage 为统一 Usage
 * @param usage Anthropic 使用量统计
 * @returns 统一使用量统计
 */
export function transformAnthropicUsage(usage: any): UnifiedUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    _anthropic: {
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens
    }
  };
}

/**
 * 转换 Google UsageMetadata 为统一 Usage
 * @param metadata Google 使用量元数据
 * @returns 统一使用量统计
 */
export function transformGoogleUsage(metadata: any): UnifiedUsage {
  return {
    inputTokens: metadata.promptTokenCount,
    outputTokens: metadata.candidatesTokenCount,
    totalTokens: metadata.totalTokenCount,
    _google: {
      trafficType: metadata.trafficType,
      promptTokensDetails: metadata.promptTokensDetails,
      candidatesTokensDetails: metadata.candidatesTokensDetails,
      thoughtsTokenCount: metadata.thoughtsTokenCount
    }
  };
}

/**
 * 映射 OpenAI 停止原因到统一停止原因
 * @param reason OpenAI 停止原因
 * @returns 统一停止原因
 */
export function mapOpenAiStopReason(
  reason: string | null | undefined
): UnifiedStopReason {
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

/**
 * 映射 Anthropic 停止原因到统一停止原因
 * @param reason Anthropic 停止原因
 * @returns 统一停止原因
 */
export function mapAnthropicStopReason(reason: string): UnifiedStopReason {
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
