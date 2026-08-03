/**
 * Codex Tool Definitions
 * 基于 Codex CLI 工具（function/custom/web_search）结构定义
 */

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
// Utility Types
// ============================================================================

export type CodexToolType = 'function' | 'custom' | 'web_search';
