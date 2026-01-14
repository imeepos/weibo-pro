import { Logger, root } from '@sker/core'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  timestamp?: string
  level?: LogLevel
  message?: string
  userId?: string
  requestId?: string
  path?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

export class StructuredLogger {
  constructor(private logger: Logger) { }

  private format(context: LogContext): LogContext {
    return {
      timestamp: context.timestamp || new Date().toISOString(),
      ...context,
    }
  }

  debug(message: string, context: LogContext = {}): void {
    this.logger.debug(message, this.format({ message, ...context }))
  }

  info(message: string, context: LogContext = {}): void {
    this.logger.info(message, this.format({ message, ...context }))
  }

  warn(message: string, context: LogContext = {}): void {
    this.logger.warn(message, this.format({ message, ...context }))
  }

  error(message: string, context: LogContext = {}): void {
    this.logger.error(message, this.format({ message, ...context }))
  }

  http(context: {
    method: string
    path: string
    statusCode: number
    duration: number
    requestId?: string
    userId?: string
  }): void {
    const level = context.statusCode >= 500 ? LogLevel.ERROR : context.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO

    const message = `${context.method} ${context.path} ${context.statusCode} - ${context.duration}ms`

    const levelMethod = level === LogLevel.ERROR ? this.error : level === LogLevel.WARN ? this.warn : level === LogLevel.INFO ? this.info : this.debug
    levelMethod.call(this, message, {
      type: 'http',
      ...context,
    })
  }

  database(context: {
    operation: string
    table?: string
    duration: number
    error?: string
  }): void {
    const level = context.error ? LogLevel.ERROR : LogLevel.DEBUG

    const message = context.error
      ? `Database ${context.operation} failed: ${context.error}`
      : `Database ${context.operation} completed in ${context.duration}ms`

    const levelMethod = level === LogLevel.ERROR ? this.error : this.debug
    levelMethod.call(this, message, {
      type: 'database',
      ...context,
    })
  }

  externalService(context: {
    service: string
    operation: string
    duration: number
    success: boolean
    error?: string
  }): void {
    const level = !context.success ? LogLevel.ERROR : LogLevel.DEBUG

    const message = !context.success
      ? `External service ${context.service}.${context.operation} failed: ${context.error || 'Unknown error'}`
      : `External service ${context.service}.${context.operation} completed in ${context.duration}ms`

    const levelMethod = level === LogLevel.ERROR ? this.error : this.debug
    levelMethod.call(this, message, {
      type: 'external_service',
      ...context,
    })
  }

  workflow(context: {
    workflowId: string
    executionId?: string
    status: string
    duration?: number
    error?: string
  }): void {
    const level = context.status === 'failed' ? LogLevel.ERROR : context.status === 'completed' ? LogLevel.INFO : LogLevel.DEBUG

    const message = `Workflow ${context.workflowId} ${context.status}${context.duration ? ` in ${context.duration}ms` : ''}`

    const levelMethod = level === LogLevel.ERROR ? this.error : level === LogLevel.INFO ? this.info : this.debug
    levelMethod.call(this, message, {
      type: 'workflow',
      ...context,
    })
  }
}

let loggerInstance: StructuredLogger | null = null

export function getStructuredLogger(): StructuredLogger {
  if (!loggerInstance) {
    loggerInstance = new StructuredLogger(root.get(Logger))
  }
  return loggerInstance
}
