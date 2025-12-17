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
// Response Types (根据需要扩展)
// ============================================================================

export interface CodexResponse {
  // TODO: 根据实际响应结构补充
  [key: string]: any;
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
export type CodexToolType = 'function' | 'custom' | 'web_search';
