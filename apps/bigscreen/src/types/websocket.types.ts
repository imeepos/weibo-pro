/**
 * WebSocket 消息类型定义
 * 提供类型安全的 WebSocket 通信
 */

import { RealTimeData, StatisticsData, HotTopic, KeywordData, TimeSeriesData, LocationData, SentimentData } from './index';

// ================== 消息数据类型 ==================

/**
 * 更新消息数据类型
 */
export interface UpdateMessageData {
  type: 'realtime' | 'statistics' | 'hotTopics' | 'keywords' | 'timeSeries' | 'locations' | 'newPost';
  payload: unknown;
}

/**
 * 具体的更新数据类型
 */
export type UpdateDataPayload =
  | { type: 'realtime'; payload: RealTimeData }
  | { type: 'statistics'; payload: StatisticsData }
  | { type: 'hotTopics'; payload: HotTopic[] }
  | { type: 'keywords'; payload: KeywordData[] }
  | { type: 'timeSeries'; payload: TimeSeriesData[] }
  | { type: 'locations'; payload: LocationData[] }
  | { type: 'newPost'; payload: SentimentData };

/**
 * 警告消息数据
 */
export interface AlertMessageData {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source?: string;
  data?: Record<string, unknown>;
}

/**
 * 心跳消息数据
 */
export interface HeartbeatMessageData {
  serverTime: string;
  connectionId: string;
}

/**
 * 连接状态消息数据
 */
export interface ConnectionStatusData {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  reason?: string;
  retryCount?: number;
  nextRetryIn?: number;
}

// ================== WebSocket 消息类型 ==================

/**
 * 严格类型的 WebSocket 消息定义
 */
export type WebSocketMessage =
  | { type: 'update'; data: UpdateDataPayload; timestamp: string; }
  | { type: 'alert'; data: AlertMessageData; timestamp: string; }
  | { type: 'heartbeat'; data: HeartbeatMessageData; timestamp: string; }
  | { type: 'connection'; data: ConnectionStatusData; timestamp: string; };

/**
 * WebSocket 消息类型枚举
 */
export const WebSocketMessageType = {
  UPDATE: 'update',
  ALERT: 'alert',
  HEARTBEAT: 'heartbeat',
  CONNECTION: 'connection'
} as const;

export type WebSocketMessageType = typeof WebSocketMessageType[keyof typeof WebSocketMessageType];
