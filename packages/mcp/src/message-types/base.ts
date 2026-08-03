/**
 * MCP JSON-RPC 2.0 基础消息类型
 */

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
