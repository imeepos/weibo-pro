/**
 * Codex Response Types
 * 基于 codex_api / codex_protocol 的响应结构定义
 */

import type { CodexInputItem } from './input';

// ============================================================================
// Response Types
// ============================================================================

/**
 * SSE 响应事件类型
 * 基于 codex_api::common::ResponseEvent
 */
export type CodexResponseEvent =
  | CodexResponseCreated
  | CodexResponseOutputItemDone
  | CodexResponseOutputItemAdded
  | CodexResponseCompleted
  | CodexResponseFailed
  | CodexResponseOutputTextDelta
  | CodexResponseReasoningSummaryDelta
  | CodexResponseReasoningContentDelta
  | CodexResponseReasoningSummaryPartAdded
  | CodexResponseRateLimits;

export interface CodexResponseCreated {
  type: 'response.created';
}

export interface CodexResponseOutputItemDone {
  type: 'response.output_item.done';
  item: CodexInputItem;
}

export interface CodexResponseOutputItemAdded {
  type: 'response.output_item.added';
  item: CodexInputItem;
}

export interface CodexResponseCompleted {
  type: 'response.completed';
  response_id: string;
  token_usage?: CodexTokenUsage;
}

export interface CodexResponseFailed {
  type: 'response.failed';
  error?: CodexStreamError;
}

export interface CodexResponseOutputTextDelta {
  type: 'response.output_text.delta';
  delta: string;
}

export interface CodexResponseReasoningSummaryDelta {
  type: 'response.reasoning_summary_text.delta';
  delta: string;
  summary_index: number;
}

export interface CodexResponseReasoningContentDelta {
  type: 'response.reasoning_text.delta';
  delta: string;
  content_index: number;
}

export interface CodexResponseReasoningSummaryPartAdded {
  type: 'response.reasoning_summary_part.added';
  summary_index: number;
}

export interface CodexResponseRateLimits {
  type: 'rate_limits';
  snapshot: CodexRateLimitSnapshot;
}

/**
 * Token 使用统计
 * 基于 codex_protocol::protocol::TokenUsage
 */
export interface CodexTokenUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

/**
 * Token 使用详细信息（用于流式响应）
 * 基于 codex_api::sse::responses::ResponseCompletedUsage
 */
export interface CodexTokenUsageDetails {
  input_tokens: number;
  input_tokens_details?: CodexInputTokensDetails;
  output_tokens: number;
  output_tokens_details?: CodexOutputTokensDetails;
  total_tokens: number;
}

export interface CodexInputTokensDetails {
  cached_tokens: number;
}

export interface CodexOutputTokensDetails {
  reasoning_tokens: number;
}

/**
 * 流式响应错误
 * 基于 codex_api::sse::responses::Error
 */
export interface CodexStreamError {
  type?: string;
  code?: string;
  message?: string;
  plan_type?: string;
  resets_at?: number;
}

/**
 * 频率限制快照
 * 基于 codex_protocol::protocol::RateLimitSnapshot
 */
export interface CodexRateLimitSnapshot {
  primary?: CodexRateLimitWindow;
  secondary?: CodexRateLimitWindow;
  credits?: CodexCreditsSnapshot;
  plan_type?: CodexPlanType;
}

/**
 * 频率限制窗口
 * 基于 codex_protocol::protocol::RateLimitWindow
 */
export interface CodexRateLimitWindow {
  /** 已使用的百分比 (0-100) */
  used_percent: number;
  /** 滚动窗口持续时间（分钟） */
  window_minutes?: number;
  /** 窗口重置时间戳（Unix 秒） */
  resets_at?: number;
}

/**
 * 积分快照
 * 基于 codex_protocol::protocol::CreditsSnapshot
 */
export interface CodexCreditsSnapshot {
  has_credits: boolean;
  unlimited: boolean;
  balance?: string;
}

/**
 * 用户计划类型
 * 基于 codex_protocol::account::PlanType
 */
export type CodexPlanType =
  | 'free'
  | 'plus'
  | 'pro'
  | 'team'
  | 'business'
  | 'enterprise'
  | 'edu'
  | 'unknown';

/**
 * 完整响应结构（非流式）
 */
export interface CodexResponse {
  id: string;
  object: 'response';
  created_at: number;
  status: 'completed' | 'failed' | 'in_progress';
  output: CodexInputItem[];
  usage?: CodexTokenUsage;
  error?: CodexResponseError;
}

/**
 * 响应错误
 */
export interface CodexResponseError {
  type?: string;
  code?: string;
  message?: string;
  plan_type?: string;
  resets_at?: number;
}
