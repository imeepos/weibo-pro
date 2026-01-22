/**
 * @fileoverview 统一抽象层类型定义
 * @description 用于解决 Anthropic、OpenAI、Google 三种厂商格式的无损转换问题
 * @version 2.0
 */

// ==================== 基础类型 ====================

/**
 * AI 服务提供商类型
 */
export type UnifiedProvider = 'anthropic' | 'openai' | 'google';

/**
 * 统一消息角色类型
 */
export type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 统一停止原因类型
 */
export type UnifiedStopReason =
  | 'end_turn'       // 正常结束
  | 'tool_use'       // 需要调用工具
  | 'max_tokens'     // 达到 token 上限
  | 'stop_sequence'  // 遇到停止序列
  | 'content_filter' // 内容过滤
  | 'error';         // 错误

// ==================== 统一内容块 ====================

/**
 * 统一文本内容块
 */
export interface UnifiedTextContent {
  type: 'text';
  text: string;
}

/**
 * 统一思考内容块（Anthropic 特有字段）
 */
export interface UnifiedThinkingContent {
  type: 'thinking';
  thinking: string;
  signature?: string;  // Anthropic 特有，保留
}

/**
 * 统一工具调用内容块
 */
export interface UnifiedToolUseContent {
  type: 'tool_use';
  id: string;          // 工具调用 ID
  name: string;        // 工具名称
  input: Record<string, unknown>;  // 参数对象（已解析）

  // 原始格式差异：
  // - Anthropic: input 直接是对象
  // - OpenAI: function.arguments 是 JSON 字符串
  // - Google: functionCall.args 是对象
}

/**
 * 统一工具结果内容块
 */
export interface UnifiedToolResultContent {
  type: 'tool_result';
  toolUseId: string;   // 对应的 tool_use id
  content: string;     // 结果内容
  isError?: boolean;   // 是否错误

  // 原始格式差异：
  // - Anthropic: tool_result content block
  // - OpenAI: role='tool' 的 message
  // - Google: functionResponse part
}

/**
 * 统一图像内容块（预留扩展）
 */
export interface UnifiedImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    mediaType?: string;
    data?: string;
    url?: string;
  };
}

/**
 * 统一内容块联合类型
 */
export type UnifiedContent =
  | UnifiedTextContent
  | UnifiedThinkingContent
  | UnifiedToolUseContent
  | UnifiedToolResultContent
  | UnifiedImageContent;

// ==================== 统一消息 ====================

/**
 * 统一消息接口
 */
export interface UnifiedMessage {
  role: UnifiedRole;
  content: string | UnifiedContent[];

  // OpenAI 特有：tool_calls 已在 assistant message 中
  // 已统一到 content 中的 UnifiedToolUseContent
}

// ==================== 统一工具定义 ====================

/**
 * 统一工具参数 Schema（JSON Schema 格式）
 */
export interface UnifiedToolParameters {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: any;
    [key: string]: any;
  }>;
  required?: string[];
}

/**
 * 统一工具定义
 */
export interface UnifiedTool {
  name: string;
  description: string;
  parameters: UnifiedToolParameters;

  // 各厂商格式差异：
  // - Anthropic: input_schema
  // - OpenAI: function.parameters
  // - Google: functionDeclarations[].parameters
}

// ==================== 统一 Usage ====================

/**
 * 统一使用量统计
 */
export interface UnifiedUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;

  // 厂商特有字段（可选保留）
  _anthropic?: {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  _openai?: {
    prompt_tokens_details?: any;
    completion_tokens_details?: any;
  };
  _google?: {
    trafficType?: string;
    promptTokensDetails?: any[];
    candidatesTokensDetails?: any[];
    thoughtsTokenCount?: number;
  };
}
