/**
 * MCP 协议消息类型定义
 * 基于 @modelcontextprotocol/sdk 的完整类型系统
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * JSON-RPC 2.0 基础消息
 */
export interface JsonRpcMessage {
  jsonrpc: '2.0';
}

/**
 * JSON-RPC 请求
 */
export interface JsonRpcRequest extends JsonRpcMessage {
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

/**
 * JSON-RPC 成功响应
 */
export interface JsonRpcSuccessResponse extends JsonRpcMessage {
  id: string | number;
  result: any;
}

/**
 * JSON-RPC 错误响应
 */
export interface JsonRpcErrorResponse extends JsonRpcMessage {
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * JSON-RPC 响应（成功或错误）
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * JSON-RPC 通知（无 id）
 */
export interface JsonRpcNotification extends JsonRpcMessage {
  method: string;
  params?: Record<string, any>;
}

// ============================================================================
// 客户端 → 服务器：请求方法
// ============================================================================

/**
 * 客户端到服务器的请求方法名称
 */
export type ClientToServerMethod =
  // 生命周期
  | 'initialize'
  | 'ping'
  // 工具
  | 'tools/list'
  | 'tools/call'
  // 资源
  | 'resources/list'
  | 'resources/read'
  | 'resources/subscribe'
  | 'resources/unsubscribe'
  | 'resources/templates/list'
  // 提示词
  | 'prompts/list'
  | 'prompts/get'
  // 工具方法
  | 'completion/complete'
  | 'logging/setLevel';

/**
 * initialize 请求参数
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * initialize 响应结果
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * tools/call 请求参数
 */
export interface CallToolParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * tools/call 响应结果
 */
export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * resources/read 请求参数
 */
export interface ReadResourceParams {
  uri: string;
}

/**
 * prompts/get 请求参数
 */
export interface GetPromptParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * completion/complete 请求参数
 */
export interface CompleteParams {
  ref: {
    type: 'ref/prompt' | 'ref/resource';
    name: string;
  };
  argument: {
    name: string;
    value: string;
  };
}

/**
 * logging/setLevel 请求参数
 */
export interface SetLevelParams {
  level: 'debug' | 'info' | 'warning' | 'error';
}

// ============================================================================
// 服务器 → 客户端：请求方法
// ============================================================================

/**
 * 服务器到客户端的请求方法名称
 */
export type ServerToClientMethod =
  | 'sampling/createMessage'
  | 'roots/list'
  | 'elicitation/create';

/**
 * sampling/createMessage 请求参数
 */
export interface CreateMessageParams {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

/**
 * sampling/createMessage 响应结果
 */
export interface CreateMessageResult {
  role: 'assistant';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  };
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

/**
 * roots/list 响应结果
 */
export interface ListRootsResult {
  roots: Array<{
    uri: string;
    name?: string;
  }>;
}

/**
 * elicitation/create 请求参数
 */
export interface CreateElicitationParams {
  prompt: string;
  mode?: 'form' | 'url';
  fields?: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    label?: string;
    description?: string;
    required?: boolean;
    options?: string[];
  }>;
}

/**
 * elicitation/create 响应结果
 */
export interface CreateElicitationResult {
  data: Record<string, any>;
}

// ============================================================================
// 通知
// ============================================================================

/**
 * 通知方法名称
 */
export type NotificationMethod =
  // 双向
  | 'notifications/cancelled'
  | 'notifications/progress'
  // 客户端 → 服务器
  | 'notifications/initialized'
  | 'notifications/roots/list_changed'
  // 服务器 → 客户端
  | 'notifications/message'
  | 'notifications/resources/updated'
  | 'notifications/resources/list_changed'
  | 'notifications/tools/list_changed'
  | 'notifications/prompts/list_changed';

/**
 * notifications/initialized 参数
 */
export interface InitializedParams {
  // 无参数
}

/**
 * notifications/cancelled 参数
 */
export interface CancelledParams {
  requestId: string | number;
  reason?: string;
}

/**
 * notifications/progress 参数
 */
export interface ProgressParams {
  progressToken: string | number;
  progress: number;
  total?: number;
}

/**
 * notifications/message 参数（日志）
 */
export interface LoggingMessageParams {
  level: 'debug' | 'info' | 'warning' | 'error';
  logger?: string;
  data: any;
}

/**
 * notifications/resources/updated 参数
 */
export interface ResourceUpdatedParams {
  uri: string;
}

/**
 * notifications/resources/list_changed 参数
 */
export interface ResourceListChangedParams {
  // 无参数
}

/**
 * notifications/tools/list_changed 参数
 */
export interface ToolListChangedParams {
  // 无参数
}

/**
 * notifications/prompts/list_changed 参数
 */
export interface PromptListChangedParams {
  // 无参数
}

/**
 * notifications/roots/list_changed 参数
 */
export interface RootsListChangedParams {
  // 无参数
}

// ============================================================================
// 能力定义
// ============================================================================

/**
 * 客户端能力
 */
export interface ClientCapabilities {
  /**
   * 采样能力（LLM 补全）
   */
  sampling?: Record<string, any>;

  /**
   * 根目录能力
   */
  roots?: {
    listChanged?: boolean;
  };

  /**
   * 用户输入能力
   */
  elicitation?: Record<string, any>;

  /**
   * 实验性能力
   */
  experimental?: Record<string, any>;
}

/**
 * 服务器能力
 */
export interface ServerCapabilities {
  /**
   * 工具能力
   */
  tools?: {
    listChanged?: boolean;
  };

  /**
   * 资源能力
   */
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };

  /**
   * 提示词能力
   */
  prompts?: {
    listChanged?: boolean;
  };

  /**
   * 日志能力
   */
  logging?: Record<string, any>;

  /**
   * 补全能力
   */
  completion?: Record<string, any>;

  /**
   * 实验性能力
   */
  experimental?: Record<string, any>;
}

// ============================================================================
// 资源类型
// ============================================================================

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * 资源定义
 */
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * 资源内容
 */
export interface ResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * 提示词定义
 */
export interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * 提示词消息
 */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 所有请求方法的联合类型
 */
export type RequestMethod = ClientToServerMethod | ServerToClientMethod;

/**
 * 消息类型守卫
 */
export function isRequest(message: JsonRpcMessage): message is JsonRpcRequest {
  return 'id' in message && 'method' in message;
}

export function isResponse(message: JsonRpcMessage): message is JsonRpcResponse {
  return 'id' in message && ('result' in message || 'error' in message);
}

export function isNotification(message: JsonRpcMessage): message is JsonRpcNotification {
  return !('id' in message) && 'method' in message;
}

export function isSuccessResponse(message: JsonRpcMessage): message is JsonRpcSuccessResponse {
  return isResponse(message) && 'result' in message;
}

export function isErrorResponse(message: JsonRpcMessage): message is JsonRpcErrorResponse {
  return isResponse(message) && 'error' in message;
}
