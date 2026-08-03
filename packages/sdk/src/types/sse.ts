/**
 * SSE 相关类型(工作流执行进度、微博登录等)
 */
import type { MediaPlatform } from './base'

export interface SSEEvent {
  type: 'progress' | 'qr_code' | 'login_success' | 'login_failed' | 'error' | 'complete' | 'health'
  data?: any
  message?: string
}

export interface WeiboLoginSSEQuery {
  nodeId?: string
}

export interface WorkflowStatusSSEQuery {
  nodeId?: string
  runId?: string
}

export interface NodeExecutionSSEQuery {
  nodeId: string
}

export interface WeiboLoginSuccessData {
  accountId: string
  username: string
  cookie: string
}

export interface ProgressData {
  progress: number
  nodeId?: string
  runId?: string
  timestamp?: string
  step?: string
}

export interface QRCodeData {
  qrUrl: string
}

export interface LoginStatusResponse {
  status: 'pending' | 'success' | 'expired' | 'error'
  message?: string
  data?: {
    accountId?: string
    username?: string
    cookie?: string
  }
}

export interface CookieLoginRequest {
  platform: MediaPlatform
  cookies: string
}

export interface ExecutionCompleteData {
  nodeId: string
  result: {
    success: boolean
    message: string
  }
}

export interface HealthData {
  status: string
  timestamp: string
  services: {
    database: string
    redis: string
    rabbitmq: string
  }
}
