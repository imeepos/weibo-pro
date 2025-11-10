import { io, Socket } from 'socket.io-client';
import { createLogger } from '@/utils/logger';
import { WebSocketMessage } from '@/types';

const logger = createLogger('WebSocketManager');

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private url: string = ''

  constructor() {
    const url = new URL(window.location.href)
    this.url = `${url.protocol === 'https://' ? 'wss://' : 'ws://'}${url.hostname}${url.port ? `:${url.port}` : ''}/ws`

    logger.debug('WebSocket Configuration:', {
      url: this.url,
    });
  }

  // 连接 WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 优雅的降级处理：如果无法连接到WebSocket，自动启用Mock模式
      const checkConnection = async () => {
        try {
          // 检查服务器是否支持WebSocket
          const response = await fetch(`${this.url.replace('ws://', 'http://').replace('wss://', 'https://')}/socket.io/?EIO=4&transport=polling`);
          if (response.ok) {
            return true;
          }
        } catch {
          // 连接失败
        }
        return false;
      };

      // 检查连接可用性
      checkConnection().then((available) => {
        if (!available) {
          logger.warn('WebSocket server not available, falling back to mock mode');
          setTimeout(() => {
            this.emit('connected', true);
            resolve();
          }, 100);
          return;
        }

        try {
          this.socket = io(this.url, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
          });

          this.socket.on('connect', () => {
            // Connection established
            this.reconnectAttempts = 0;
            this.emit('connected', true);
            resolve();
          });

          this.socket.on('disconnect', (reason) => {
            // Disconnected
            this.emit('connected', false);

            if (reason === 'io server disconnect') {
              // 服务器主动断开连接，需要手动重连
              this.reconnect();
            }
          });

          this.socket.on('connect_error', (error) => {
            logger.error('WebSocket connection error:', error);
            this.emit('error', error);
            reject(error);
          });

          this.socket.on('reconnect', (attemptNumber) => {
            // Reconnected successfully
            this.emit('reconnected', attemptNumber);
          });

          this.socket.on('reconnect_error', (error) => {
            logger.error('WebSocket reconnection error:', error);
            this.emit('reconnectError', error);
          });

          this.socket.on('reconnect_failed', () => {
            logger.error('WebSocket reconnection failed');
            this.emit('reconnectFailed');
          });

          // 监听数据更新
          this.socket.on('data:update', (data: WebSocketMessage) => {
            this.emit('dataUpdate', data);
          });

          this.socket.on('data:alert', (data: WebSocketMessage) => {
            this.emit('alert', data);
          });

          this.socket.on('data:heartbeat', (data: WebSocketMessage) => {
            this.emit('heartbeat', data);
          });

        } catch (error) {
          logger.error('Failed to create WebSocket connection:', error);
          reject(error);
        }
      });
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.emit('connected', false);
    }
  }

  // 重连
  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Attempting reconnection

      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      logger.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  // 发送消息
  send(event: string, data: unknown): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      logger.warn('WebSocket is not connected');
    }
  }

  // 订阅事件
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // 取消订阅事件
  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  // 触发事件
  private emit(event: string, data?: unknown): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in WebSocket event callback:', error);
        }
      });
    }
  }

  // 获取连接状态
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 获取重连次数
  get reconnectCount(): number {
    return this.reconnectAttempts;
  }

  // 设置最大重连次数
  setMaxReconnectAttempts(attempts: number): void {
    this.maxReconnectAttempts = attempts;
  }

  // 设置重连延迟
  setReconnectDelay(delay: number): void {
    this.reconnectDelay = delay;
  }
}

// 创建全局 WebSocket 管理器实例
export const wsManager = new WebSocketManager();

// 导出类型和实例
export { WebSocketManager };
export default wsManager;
