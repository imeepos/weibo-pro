import type { StreamSender } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

/**
 * 结构化日志工具
 */
export class Logger {
  constructor(
    private stream: StreamSender | undefined,
    private service: string = 'weibo-proxy-worker',
    private env: string = 'dev'
  ) {}

  /**
   * 发送日志到 Stream
   */
  private send(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.stream) {
      console.log(`[${level.toUpperCase()}]`, message, context);
      return;
    }

    // 使用 queueMicrotask 确保不阻塞主流程
    queueMicrotask(() => {
      this.stream!.send([{
        value: {
          // Datadog 标准字段
          ddsource: this.service,
          ddtags: `env:${this.env},level:${level}`,
          service: this.service,
          hostname: 'cloudflare-worker',

          // 日志内容
          message,
          level,
          timestamp: Date.now(),

          // 上下文数据
          ...context,
        },
      }]).catch((err) => {
        console.error('Failed to send log:', err);
      });
    });
  }

  debug(message: string, context?: LogContext): void {
    this.send('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.send('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.send('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.send('error', message, context);
  }

  /**
   * 记录代理请求
   */
  logProxyRequest(url: string, method: string, status?: number): void {
    this.info('proxy.request', {
      url,
      method,
      status,
    });
  }

  /**
   * 记录错误
   */
  logError(error: unknown, context?: LogContext): void {
    this.error('proxy.error', {
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      ...context,
    });
  }
}
