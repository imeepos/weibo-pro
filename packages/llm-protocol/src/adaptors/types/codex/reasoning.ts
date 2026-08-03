/**
 * Codex Reasoning Types
 * 基于 Codex CLI 工具的推理配置与内容结构定义
 */

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
