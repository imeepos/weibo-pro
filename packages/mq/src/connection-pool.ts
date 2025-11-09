import * as amqp from 'amqplib';
import type { RabbitMQConfig } from './types.js';
import { ConnectionState } from './types.js';

/**
 * 连接池管理器
 *
 * 优雅即简约:
 * - 自动重连
 * - 连接复用
 * - 简化的回调机制（移除复杂的事件系统）
 *
 * 存在即合理:
 * - connection: RabbitMQ 连接
 * - channel: 通信信道
 * - state: 连接状态
 * - 重连逻辑
 */
export class ConnectionPool {
  private connection: any = null;
  private channel: any = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private reconnectStartedAt: number = 0;
  private connectionPromise: Promise<void> | null = null;

  // 简化的回调机制
  private onReconnectedCallback?: () => void;

  constructor(
    private readonly config: RabbitMQConfig,
    callbacks?: {
      onReconnected?: () => void;
    }
  ) {
    this.onReconnectedCallback = callbacks?.onReconnected;
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.setState(ConnectionState.CONNECTING);

    this.connectionPromise = (async () => {
      try {
        this.connection = await amqp.connect(this.config.url, {
          heartbeat: this.config.heartbeat ?? 30,
        });

        this.setupConnectionHandlers();

        this.channel = await this.connection.createConfirmChannel();
        this.setupChannelHandlers();

        this.setState(ConnectionState.CONNECTED);

        const wasReconnecting = this.reconnectAttempts > 0;
        if (wasReconnecting) {
          const reconnectDuration = Date.now() - this.reconnectStartedAt;
          console.log(
            `[ConnectionPool] 重连成功，尝试次数: ${this.reconnectAttempts}, 耗时: ${reconnectDuration}ms`
          );

          // 触发重连回调
          this.onReconnectedCallback?.();
        }

        this.reconnectAttempts = 0;
        this.reconnectStartedAt = 0;
        this.connectionPromise = null;
      } catch (error) {
        this.connectionPromise = null;
        await this.cleanup();
        this.setState(ConnectionState.ERROR);
        this.scheduleReconnect();
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {});
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close().catch(() => {});
        this.connection = null;
      }
    } catch {
      // 忽略清理错误
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', (error: Error) => {
      console.error('[ConnectionPool] 连接错误:', error);
      this.scheduleReconnect();
    });

    this.connection.on('close', () => {
      console.warn('[ConnectionPool] 连接已关闭');
      this.setState(ConnectionState.DISCONNECTED);
      this.scheduleReconnect();
    });

    this.connection.on('blocked', (reason: string) => {
      console.warn('[ConnectionPool] 连接被阻塞:', reason);
    });

    this.connection.on('unblocked', () => {
      console.log('[ConnectionPool] 连接解除阻塞');
    });
  }

  private setupChannelHandlers(): void {
    if (!this.channel) return;

    this.channel.on('error', (error: Error) => {
      console.error('[ConnectionPool] 通道错误:', error);
    });

    this.channel.on('close', () => {
      console.warn('[ConnectionPool] 通道已关闭，触发重连');
      this.channel = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.setState(ConnectionState.RECONNECTING);

    if (this.reconnectAttempts === 0) {
      this.reconnectStartedAt = Date.now();
    }
    this.reconnectAttempts++;

    const reconnectDelay = Math.min(5000 * this.reconnectAttempts, 30000);
    console.log(
      `[ConnectionPool] 将在 ${reconnectDelay}ms 后进行第 ${this.reconnectAttempts} 次重连尝试`
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        console.error('[ConnectionPool] 重连失败:', error);
      }
    }, reconnectDelay);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
  }

  async waitForConnection(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (!this.isConnected()) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`等待连接超时: ${timeoutMs}ms`);
      }

      if (this.connectionPromise) {
        await this.connectionPromise;
        continue;
      }

      if (this.state === ConnectionState.DISCONNECTED || this.state === ConnectionState.ERROR) {
        await this.connect();
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  getChannel(): any {
    if (!this.channel) {
      throw new Error('通道不可用，连接未建立');
    }
    return this.channel;
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && !!this.channel;
  }

  async close(): Promise<void> {
    this.setState(ConnectionState.CLOSING);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts = 0;
    this.reconnectStartedAt = 0;

    try {
      if (this.connection) {
        this.connection.removeAllListeners();
      }

      if (this.channel) {
        this.channel.removeAllListeners();
      }

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.setState(ConnectionState.CLOSED);
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      throw error;
    }
  }
}
