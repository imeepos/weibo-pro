/**
 * WebSocket 消息构建工具
 */

import type {
  WebSocketMessage,
  UpdateDataPayload,
  AlertMessageData,
  HeartbeatMessageData,
  ConnectionStatusData,
} from './websocket.types';

/**
 * 创建更新消息
 */
export function createUpdateMessage(data: UpdateDataPayload): Extract<WebSocketMessage, { type: 'update' }> {
  return {
    type: 'update',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建警告消息
 */
export function createAlertMessage(data: AlertMessageData): Extract<WebSocketMessage, { type: 'alert' }> {
  return {
    type: 'alert',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建心跳消息
 */
export function createHeartbeatMessage(data: HeartbeatMessageData): Extract<WebSocketMessage, { type: 'heartbeat' }> {
  return {
    type: 'heartbeat',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建连接状态消息
 */
export function createConnectionMessage(data: ConnectionStatusData): Extract<WebSocketMessage, { type: 'connection' }> {
  return {
    type: 'connection',
    data,
    timestamp: new Date().toISOString()
  };
}
