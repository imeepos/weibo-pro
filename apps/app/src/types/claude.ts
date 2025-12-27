/**
 * Claude Types - 移动端类型定义
 */

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
  | 'result'
  | 'complete'
  | 'error'
  | 'token-budget';

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
  taskId?: string;
  isStreaming?: boolean;
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
