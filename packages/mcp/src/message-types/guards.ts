import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
} from './base';
import type { ClientToServerMethod } from './client-to-server';
import type { ServerToClientMethod } from './server-to-client';

/**
 * 工具类型：请求方法联合与消息类型守卫
 */

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
