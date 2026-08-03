/**
 * WebSocket 消息类型守卫与数据验证函数
 */

import type {
  WebSocketMessage,
  UpdateDataPayload,
  AlertMessageData,
  HeartbeatMessageData,
} from './websocket.types';

/**
 * 检查是否为有效的 WebSocket 消息
 */
export function isValidWebSocketMessage(obj: unknown): obj is WebSocketMessage {
  if (!obj || typeof obj !== 'object') return false;

  const msg = obj as Record<string, unknown>;

  return (
    typeof msg.type === 'string' &&
    ['update', 'alert', 'heartbeat', 'connection'].includes(msg.type) &&
    typeof msg.timestamp === 'string' &&
    typeof msg.data === 'object'
  );
}

/**
 * 检查是否为更新消息
 */
export function isUpdateMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'update' }> {
  return msg.type === 'update';
}

/**
 * 检查是否为警告消息
 */
export function isAlertMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'alert' }> {
  return msg.type === 'alert';
}

/**
 * 检查是否为心跳消息
 */
export function isHeartbeatMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'heartbeat' }> {
  return msg.type === 'heartbeat';
}

/**
 * 检查是否为连接状态消息
 */
export function isConnectionMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'connection' }> {
  return msg.type === 'connection';
}

/**
 * 检查更新消息的具体类型
 */
export function isRealtimeUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'realtime' }> {
  return data.type === 'realtime';
}

export function isStatisticsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'statistics' }> {
  return data.type === 'statistics';
}

export function isHotTopicsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'hotTopics' }> {
  return data.type === 'hotTopics';
}

export function isKeywordsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'keywords' }> {
  return data.type === 'keywords';
}

export function isTimeSeriesUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'timeSeries' }> {
  return data.type === 'timeSeries';
}

export function isLocationsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'locations' }> {
  return data.type === 'locations';
}

export function isNewPostUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'newPost' }> {
  return data.type === 'newPost';
}

/**
 * 验证更新消息数据
 */
export function validateUpdateData(data: unknown): data is UpdateDataPayload {
  if (!data || typeof data !== 'object') return false;

  const updateData = data as Record<string, unknown>;

  return (
    typeof updateData.type === 'string' &&
    ['realtime', 'statistics', 'hotTopics', 'keywords', 'timeSeries', 'locations', 'newPost'].includes(updateData.type) &&
    'payload' in updateData
  );
}

/**
 * 验证警告消息数据
 */
export function validateAlertData(data: unknown): data is AlertMessageData {
  if (!data || typeof data !== 'object') return false;

  const alertData = data as Record<string, unknown>;

  return (
    typeof alertData.level === 'string' &&
    ['info', 'warning', 'error', 'critical'].includes(alertData.level) &&
    typeof alertData.title === 'string' &&
    typeof alertData.message === 'string'
  );
}

/**
 * 验证心跳消息数据
 */
export function validateHeartbeatData(data: unknown): data is HeartbeatMessageData {
  if (!data || typeof data !== 'object') return false;

  const heartbeatData = data as Record<string, unknown>;

  return (
    typeof heartbeatData.serverTime === 'string' &&
    typeof heartbeatData.connectionId === 'string'
  );
}
