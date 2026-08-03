/**
 * WebSocket 消息处理器与分发器
 */

import { createLogger } from '@sker/core';
import type {
  UpdateDataPayload,
  AlertMessageData,
  HeartbeatMessageData,
  ConnectionStatusData,
} from './websocket.types';
import {
  isValidWebSocketMessage,
  isUpdateMessage,
  isAlertMessage,
  isHeartbeatMessage,
  isConnectionMessage,
} from './websocket.guards';

/**
 * WebSocket 消息处理器接口
 */
export interface WebSocketMessageHandler {
  onUpdate?: (data: UpdateDataPayload) => void;
  onAlert?: (data: AlertMessageData) => void;
  onHeartbeat?: (data: HeartbeatMessageData) => void;
  onConnection?: (data: ConnectionStatusData) => void;
  onError?: (error: Error) => void;
}

const logger = createLogger('WebSocketMessageDispatcher');

/**
 * 消息分发器
 */
export class WebSocketMessageDispatcher {
  private handlers: WebSocketMessageHandler[] = [];

  /**
   * 添加消息处理器
   */
  addHandler(handler: WebSocketMessageHandler): void {
    this.handlers.push(handler);
  }

  /**
   * 移除消息处理器
   */
  removeHandler(handler: WebSocketMessageHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message: unknown): void {
    try {
      if (!isValidWebSocketMessage(message)) {
        throw new Error('Invalid WebSocket message format');
      }

      this.handlers.forEach(handler => {
        try {
          if (isUpdateMessage(message) && handler.onUpdate) {
            handler.onUpdate(message.data);
          } else if (isAlertMessage(message) && handler.onAlert) {
            handler.onAlert(message.data);
          } else if (isHeartbeatMessage(message) && handler.onHeartbeat) {
            handler.onHeartbeat(message.data);
          } else if (isConnectionMessage(message) && handler.onConnection) {
            handler.onConnection(message.data);
          }
        } catch (error) {
          logger.error('Error in message handler:', error);
          if (handler.onError) {
            handler.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
      this.handlers.forEach(handler => {
        if (handler.onError) {
          handler.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }
  }

  /**
   * 清除所有处理器
   */
  clearHandlers(): void {
    this.handlers = [];
  }
}
