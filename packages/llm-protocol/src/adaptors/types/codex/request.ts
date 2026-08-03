/**
 * Codex CLI Main Request Structure
 * 基于 Codex CLI 工具的请求结构定义
 */

import type { CodexReasoning } from './reasoning';
import type { CodexInputItem } from './input';
import type { CodexTool } from './tools';

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
