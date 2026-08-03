/**
 * Codex Input Items (Messages, Reasoning, Function Calls)
 * 基于 Codex CLI 工具的请求输入结构定义
 */

import type {
  CodexReasoningSummary,
  CodexReasoningContent,
} from './reasoning';

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
