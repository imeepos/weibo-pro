/**
 * Claude Types - 移动端类型定义
 */

/**
 * 权限模式
 */
export type PermissionMode = 'default' | 'plan' | 'bypassPermissions';

/**
 * WebSocket 客户端命令
 */
export interface WsClaudeCommand {
  /** 用户输入的命令 */
  command: string;
  /** 会话 ID（可选，用于恢复会话） */
  sessionId?: string;
  /** 工作目录 */
  cwd?: string;
  /** 使用的模型 */
  model?: string;
  /** 权限模式 */
  permissionMode?: PermissionMode;
}

/**
 * WebSocket 响应
 */
export interface WsClaudeResponse {
  /** 任务 ID */
  taskId: string;
  /** 会话 ID */
  sessionId: string;
  /** 响应类型 */
  type: ClaudeResponseType;
  /** 响应数据 */
  data: unknown;
}

/**
 * 响应类型
 */
export type ClaudeResponseType =
  | 'session-created'
  | 'message'
  | 'tool-use'
  | 'result'
  | 'complete'
  | 'error'
  | 'token-budget'
  | 'approval-request';

/**
 * 批准请求数据
 */
export interface ApprovalRequest {
  /** 请求 ID */
  requestId: string;
  /** 操作描述 */
  description: string;
  /** 命令内容 */
  command?: string;
  /** 工具名称 */
  toolName?: string;
  /** 风险级别 */
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * 连接状态
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sequence: number;
  taskId?: string;
  isStreaming?: boolean;
  messageType?: 'text' | 'system-init' | 'tool-use' | 'result' | 'token-budget' | 'complete';
  metadata?: {
    toolName?: string;
    duration?: number;
    tokensUsed?: number;
    tokensTotal?: number;
    status?: 'success' | 'error';
  };
}

/**
 * 会话信息
 */
export interface Session {
  id: string;
  createdAt: number;
  lastMessageAt: number;
  messages: ChatMessage[];
}
