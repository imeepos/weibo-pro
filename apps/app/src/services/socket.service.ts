/**
 * Socket Service - Socket.IO 客户端服务
 *
 * 管理与服务器的 WebSocket 连接
 * 使用 RxJS 进行事件流处理
 */

import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import type { WsClaudeCommand, WsClaudeResponse, ConnectionStatus } from '@/types';

/** 默认服务器地址 */
const DEFAULT_SERVER_URL = 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string = DEFAULT_SERVER_URL;

  /** 连接状态 */
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>('disconnected');

  /** 客户端 ID */
  private clientId$ = new BehaviorSubject<string | null>(null);

  /** 响应流 */
  private response$ = new Subject<WsClaudeResponse>();

  /** 任务创建事件 */
  private taskCreated$ = new Subject<{ taskId: string }>();

  /** 错误事件 */
  private error$ = new Subject<{ type: string; data: { message: string; code?: string } }>();

  /**
   * 连接到服务器
   */
  connect(serverUrl?: string): void {
    if (this.socket?.connected) {
      console.log('[SocketService] 已连接');
      return;
    }

    this.serverUrl = serverUrl || DEFAULT_SERVER_URL;
    this.connectionStatus$.next('connecting');

    console.log(`[SocketService] 正在连接: ${this.serverUrl}`);

    this.socket = io(this.serverUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus$.next('disconnected');
      this.clientId$.next(null);
      console.log('[SocketService] 已断开连接');
    }
  }

  /**
   * 发送命令
   */
  sendCommand(command: WsClaudeCommand): void {
    if (!this.socket?.connected) {
      console.error('[SocketService] 未连接，无法发送命令');
      this.error$.next({
        type: 'error',
        data: {
          message: '未连接到服务器',
          code: 'NOT_CONNECTED',
        },
      });
      return;
    }

    console.log(`[SocketService] 发送命令: ${command.command.substring(0, 50)}...`);
    this.socket.emit('claude:command', command);
  }

  /**
   * 中断任务
   */
  abortTask(taskId: string): void {
    if (!this.socket?.connected) {
      console.error('[SocketService] 未连接，无法中断任务');
      return;
    }

    console.log(`[SocketService] 中断任务: ${taskId}`);
    this.socket.emit('claude:abort', { taskId });
  }

  /**
   * 获取连接状态 Observable
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * 获取客户端 ID Observable
   */
  getClientId(): Observable<string | null> {
    return this.clientId$.asObservable();
  }

  /**
   * 获取响应 Observable
   */
  getResponses(): Observable<WsClaudeResponse> {
    return this.response$.asObservable();
  }

  /**
   * 获取任务创建事件 Observable
   */
  getTaskCreated(): Observable<{ taskId: string }> {
    return this.taskCreated$.asObservable();
  }

  /**
   * 获取错误事件 Observable
   */
  getErrors(): Observable<{ type: string; data: { message: string; code?: string } }> {
    return this.error$.asObservable();
  }

  /**
   * 获取当前连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('[SocketService] 连接成功');
      this.connectionStatus$.next('connected');
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log(`[SocketService] 连接断开: ${reason}`);
      this.connectionStatus$.next('disconnected');
      this.clientId$.next(null);
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error(`[SocketService] 连接错误: ${error.message}`);
      this.connectionStatus$.next('error');
      this.error$.next({
        type: 'error',
        data: {
          message: `连接失败: ${error.message}`,
          code: 'CONNECTION_ERROR',
        },
      });
    });

    // 收到客户端 ID
    this.socket.on('claude:connected', (data: { clientId: string }) => {
      console.log(`[SocketService] 收到客户端 ID: ${data.clientId}`);
      this.clientId$.next(data.clientId);
    });

    // 收到响应
    this.socket.on('claude:response', (response: WsClaudeResponse) => {
      console.log(`[SocketService] 收到响应: type=${response.type}, taskId=${response.taskId}`);
      this.response$.next(response);
    });

    // 任务创建
    this.socket.on('claude:task-created', (data: { taskId: string }) => {
      console.log(`[SocketService] 任务已创建: ${data.taskId}`);
      this.taskCreated$.next(data);
    });

    // 错误
    this.socket.on('claude:error', (error: { type: string; data: { message: string; code?: string } }) => {
      console.error(`[SocketService] 错误: ${error.data.message}`);
      this.error$.next(error);
    });

    // 中断确认
    this.socket.on('claude:abort-ack', (data: { taskId: string; success: boolean }) => {
      console.log(`[SocketService] 中断确认: taskId=${data.taskId}, success=${data.success}`);
    });
  }
}

// 导出单例
export const socketService = new SocketService();
