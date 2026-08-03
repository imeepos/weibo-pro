/**
 * Codex Stream Event Utilities
 * 用于类型守卫和事件过滤
 */

import type {
  CodexResponseEvent,
  CodexResponseCreated,
  CodexResponseOutputItemAdded,
  CodexResponseOutputItemDone,
  CodexResponseOutputTextDelta,
  CodexResponseReasoningSummaryDelta,
  CodexResponseReasoningContentDelta,
  CodexResponseReasoningSummaryPartAdded,
  CodexResponseCompleted,
  CodexResponseFailed,
  CodexResponseRateLimits,
} from './response';

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
