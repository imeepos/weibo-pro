/**
 * Codex CLI Request/Response Type Definitions
 * 基于 Codex CLI 工具的请求响应结构定义
 */

// ============================================================================
// Main Request Structure
// ============================================================================

export interface CodexRequest {
  model: string;
  instructions: string;
  input: CodexInputItem[];
  tools: CodexTool[];
  tool_choice: 'auto' | 'none' | string;
  parallel_tool_calls: boolean;
  reasoning?: CodexReasoning;
  store?: boolean;
  stream: boolean;
  include: string[];
  prompt_cache_key?: string;
  text?: CodexTextConfig;
  conversation_id?: string;
  session_source?: CodexSessionSource;
}

export interface CodexSessionSource {
  type: 'subagent';
  source: 'review' | 'triage' | 'test' | string;
}

export interface CodexTextConfig {
  verbosity?: 'low' | 'medium' | 'high';
  format?: CodexTextFormat;
}

export interface CodexTextFormat {
  type: 'json_schema';
  strict: boolean;
  schema: Record<string, any>;
  name: string;
}

// ============================================================================
// Reasoning
// ============================================================================

export interface CodexReasoning {
  effort?: 'low' | 'medium' | 'high';
  summary?: 'auto' | 'enabled' | 'disabled';
}

export interface CodexReasoningSummary {
  type: 'summary_text';
  text: string;
}

export interface CodexReasoningContent {
  type: 'reasoning_text' | 'text';
  text: string;
}

// ============================================================================
// Input Items (Messages, Reasoning, Function Calls)
// ============================================================================

export type CodexInputItem =
  | CodexMessageInput
  | CodexReasoningInput
  | CodexFunctionCall
  | CodexFunctionCallOutput
  | CodexLocalShellCall
  | CodexCustomToolCall
  | CodexCustomToolCallOutput
  | CodexWebSearchCall
  | CodexCompaction;

export interface CodexMessageInput {
  type: 'message';
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: CodexContent[];
}

export interface CodexReasoningInput {
  type: 'reasoning';
  id?: string;
  summary: CodexReasoningSummary[];
  content?: CodexReasoningContent[];
  encrypted_content?: string;
}

export interface CodexFunctionCall {
  type: 'function_call';
  id?: string;
  name: string;
  arguments: string;
  call_id: string;
}

export interface CodexFunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface CodexLocalShellCall {
  type: 'local_shell_call';
  id?: string;
  call_id?: string;
  status: 'completed' | 'in_progress' | 'incomplete';
  action: CodexLocalShellAction;
}

export interface CodexLocalShellAction {
  type: 'exec';
  command: string[];
  timeout_ms?: number;
  working_directory?: string;
  env?: Record<string, string>;
  user?: string;
}

export interface CodexCustomToolCall {
  type: 'custom_tool_call';
  id?: string;
  status?: string;
  call_id: string;
  name: string;
  input: string;
}

export interface CodexCustomToolCallOutput {
  type: 'custom_tool_call_output';
  call_id: string;
  output: string;
}

export interface CodexWebSearchCall {
  type: 'web_search_call';
  id?: string;
  status?: string;
  action: CodexWebSearchAction;
}

export type CodexWebSearchAction =
  | { type: 'search'; query?: string }
  | { type: 'open_page'; url?: string }
  | { type: 'find_in_page'; url?: string; pattern?: string }
  | { type: 'other' };

export interface CodexCompaction {
  type: 'compaction';
  encrypted_content: string;
}

// ============================================================================
// Content Types
// ============================================================================

export type CodexContent = CodexInputText | CodexInputImage | CodexOutputText;

export interface CodexInputText {
  type: 'input_text';
  text: string;
}

export interface CodexInputImage {
  type: 'input_image';
  image_url: string;
}

export interface CodexOutputText {
  type: 'output_text';
  text: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export type CodexTool =
  | CodexFunctionTool
  | CodexCustomTool
  | CodexWebSearchTool;

export interface CodexFunctionTool {
  type: 'function';
  name: string;
  description: string;
  strict: boolean;
  parameters: CodexFunctionParameters;
}

export interface CodexFunctionParameters {
  type: 'object';
  properties: Record<string, CodexParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface CodexParameterProperty {
  type: string;
  description?: string;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  format?: string;
  title?: string;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  // 支持嵌套对象和数组
  items?: CodexParameterProperty;
  properties?: Record<string, CodexParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface CodexCustomTool {
  type: 'custom';
  name: string;
  description: string;
  format: CodexCustomToolFormat;
}

export interface CodexCustomToolFormat {
  type: 'grammar';
  syntax: string;
  definition: string;
}

export interface CodexWebSearchTool {
  type: 'web_search';
}

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

// ============================================================================
// Stream Event Utilities
// ============================================================================

/**
 * 流式事件类型枚举
 * 用于类型守卫和事件过滤
 */
export enum CodexStreamEventType {
  Created = 'response.created',
  OutputItemAdded = 'response.output_item.added',
  OutputItemDone = 'response.output_item.done',
  OutputTextDelta = 'response.output_text.delta',
  ReasoningSummaryDelta = 'response.reasoning_summary_text.delta',
  ReasoningContentDelta = 'response.reasoning_text.delta',
  ReasoningSummaryPartAdded = 'response.reasoning_summary_part.added',
  Completed = 'response.completed',
  Failed = 'response.failed',
  RateLimits = 'rate_limits',
}

/**
 * 流式事件类型守卫
 */
export const isCodexStreamEvent = {
  created: (event: CodexResponseEvent): event is CodexResponseCreated =>
    event.type === CodexStreamEventType.Created,

  outputItemAdded: (event: CodexResponseEvent): event is CodexResponseOutputItemAdded =>
    event.type === CodexStreamEventType.OutputItemAdded,

  outputItemDone: (event: CodexResponseEvent): event is CodexResponseOutputItemDone =>
    event.type === CodexStreamEventType.OutputItemDone,

  outputTextDelta: (event: CodexResponseEvent): event is CodexResponseOutputTextDelta =>
    event.type === CodexStreamEventType.OutputTextDelta,

  reasoningSummaryDelta: (event: CodexResponseEvent): event is CodexResponseReasoningSummaryDelta =>
    event.type === CodexStreamEventType.ReasoningSummaryDelta,

  reasoningContentDelta: (event: CodexResponseEvent): event is CodexResponseReasoningContentDelta =>
    event.type === CodexStreamEventType.ReasoningContentDelta,

  reasoningSummaryPartAdded: (event: CodexResponseEvent): event is CodexResponseReasoningSummaryPartAdded =>
    event.type === CodexStreamEventType.ReasoningSummaryPartAdded,

  completed: (event: CodexResponseEvent): event is CodexResponseCompleted =>
    event.type === CodexStreamEventType.Completed,

  failed: (event: CodexResponseEvent): event is CodexResponseFailed =>
    event.type === CodexStreamEventType.Failed,

  rateLimits: (event: CodexResponseEvent): event is CodexResponseRateLimits =>
    event.type === CodexStreamEventType.RateLimits,
};

/**
 * 判断是否为内容增量事件（文本或推理）
 */
export const isContentDeltaEvent = (event: CodexResponseEvent): boolean => {
  return (
    event.type === CodexStreamEventType.OutputTextDelta ||
    event.type === CodexStreamEventType.ReasoningSummaryDelta ||
    event.type === CodexStreamEventType.ReasoningContentDelta
  );
};

/**
 * 判断是否为终止事件
 */
export const isTerminalEvent = (event: CodexResponseEvent): boolean => {
  return (
    event.type === CodexStreamEventType.Completed ||
    event.type === CodexStreamEventType.Failed
  );
};

/**
 * 从事件中提取文本内容
 */
export const extractTextFromEvent = (event: CodexResponseEvent): string | null => {
  if (isCodexStreamEvent.outputTextDelta(event)) {
    return event.delta;
  }
  if (isCodexStreamEvent.reasoningSummaryDelta(event)) {
    return event.delta;
  }
  if (isCodexStreamEvent.reasoningContentDelta(event)) {
    return event.delta;
  }
  return null;
};

// ============================================================================
// Utility Types
// ============================================================================

export type CodexRole = 'user' | 'assistant' | 'system' | 'developer';
export type CodexMessageType =
  | 'message'
  | 'reasoning'
  | 'function_call'
  | 'function_call_output'
  | 'local_shell_call'
  | 'custom_tool_call'
  | 'custom_tool_call_output'
  | 'web_search_call'
  | 'compaction';
export type CodexContentType = 'input_text' | 'input_image' | 'output_text';
export type CodexToolType = 'function' | 'custom' | 'web_search';
