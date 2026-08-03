import type { ClientCapabilities, ServerCapabilities } from './capabilities';

/**
 * 客户端 → 服务器：请求方法
 */

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
