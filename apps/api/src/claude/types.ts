/**
 * Claude Types - 服务器端类型定义
 *
 * 复用 @sker/cli 的类型定义，确保三层架构类型一致
 */

/**
 * Claude 命令消息 - 从客户端发送到服务器
 */
export interface ClaudeCommand {
  /** 任务唯一标识符 */
  taskId: string;
  /** 客户端标识符（用于响应路由） */
  clientId: string;
  /** 会话 ID（用于恢复会话） */
  sessionId?: string;
  /** 用户输入的命令/提示词 */
  command: string;
  /** 工作目录 */
  cwd?: string;
  /** 使用的模型 */
  model?: string;
  /** 权限模式 */
  permissionMode?: 'default' | 'plan' | 'bypassPermissions';
  /** 时间戳 */
  timestamp: number;
}

/**
 * Claude 响应消息 - 从执行端发送回服务器
 */
export interface ClaudeResponse {
  /** 任务唯一标识符 */
  taskId: string;
  /** 客户端标识符 */
  clientId: string;
  /** 会话 ID */
  sessionId: string;
  /** 响应类型 */
  type: ClaudeResponseType;
  /** 响应数据 */
  data: unknown;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 响应类型枚举
 */
export type ClaudeResponseType =
  | 'session-created'
  | 'message'
  | 'result'
  | 'complete'
  | 'error'
  | 'token-budget';

/**
 * WebSocket 客户端命令 - 从移动端发送
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
 * WebSocket 响应 - 发送给移动端
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
 * 客户端连接信息
 */
export interface ClientConnection {
  /** Socket ID */
  socketId: string;
  /** 连接时间 */
  connectedAt: number;
  /** 活动任务 ID 列表 */
  activeTasks: Set<string>;
}
