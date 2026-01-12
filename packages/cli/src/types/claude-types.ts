/**
 * Claude Types - 类型定义
 *
 * 存在即合理:
 * - 统一的类型定义确保三层架构类型安全
 * - 支持 RabbitMQ 消息序列化
 */

/**
 * Claude 命令消息 - 从服务器发送到执行端
 *
 * 通过 RabbitMQ claude.commands 队列传输
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
 * Claude 响应消息 - 从执行端发送到服务器
 *
 * 通过 RabbitMQ claude.responses 队列传输
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
  data: ClaudeResponseData;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 响应类型枚举
 */
export type ClaudeResponseType =
  | 'session-created'  // 新会话创建
  | 'message'          // 流式消息
  | 'tool-use'         // 工具执行请求
  | 'result'           // 最终结果
  | 'complete'         // 任务完成
  | 'error'            // 错误
  | 'token-budget'     // Token 使用情况
  | 'approval-request';// 批准请求

/**
 * 响应数据联合类型
 * 使用 unknown 类型以支持 SDK 返回的各种消息格式
 */
export type ClaudeResponseData =
  | SessionCreatedData
  | MessageData
  | ResultData
  | CompleteData
  | ErrorData
  | TokenBudgetData
  | ApprovalRequestData
  | Record<string, unknown>;

/**
 * 会话创建数据
 */
export interface SessionCreatedData {
  sessionId: string;
}

/**
 * 流式消息数据 - 与 SDK 消息格式兼容
 */
export interface MessageData {
  type: string;
  [key: string]: unknown;
}

/**
 * 结果数据
 */
export interface ResultData {
  type: 'result';
  modelUsage?: Record<string, ModelUsage>;
  [key: string]: unknown;
}

/**
 * 模型使用情况
 */
export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cumulativeInputTokens?: number;
  cumulativeOutputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  cumulativeCacheReadInputTokens?: number;
  cumulativeCacheCreationInputTokens?: number;
}

/**
 * 完成数据
 */
export interface CompleteData {
  exitCode: number;
  isNewSession: boolean;
}

/**
 * 错误数据
 */
export interface ErrorData {
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Token 预算数据
 */
export interface TokenBudgetData {
  used: number;
  total: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

/**
 * 批准请求数据
 */
export interface ApprovalRequestData {
  requestId: string;
  description: string;
  command?: string;
  toolName?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * 批准响应命令
 */
export interface ApprovalResponseCommand {
  requestId: string;
  approved: boolean;
}

/**
 * SDK 查询选项 - 映射到 @anthropic-ai/claude-agent-sdk
 */
export interface ClaudeSdkOptions {
  /** 工作目录 */
  cwd?: string;
  /** 权限模式 */
  permissionMode?: 'default' | 'plan' | 'bypassPermissions';
  /** 允许的工具列表 */
  allowedTools?: string[];
  /** 禁止的工具列表 */
  disallowedTools?: string[];
  /** 使用的模型 */
  model?: string;
  /** 恢复会话 ID */
  resume?: string;
  /** 系统提示配置 */
  systemPrompt?: {
    type: 'preset';
    preset: string;
  };
  /** 设置来源 */
  settingSources?: string[];
  /** MCP 服务器配置 */
  mcpServers?: Record<string, {
    type?: 'stdio' | 'sse' | 'http' | 'sdk';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    name?: string;
  }>;
}

/**
 * 活动会话信息
 */
export interface ActiveSession {
  /** SDK 查询实例 */
  instance: AsyncIterable<unknown> & { interrupt: () => Promise<void> };
  /** 开始时间 */
  startTime: number;
  /** 会话状态 */
  status: 'active' | 'completed' | 'aborted' | 'error';
  /** 任务 ID */
  taskId: string;
  /** 客户端 ID */
  clientId: string;
}

/**
 * 任务状态枚举
 */
export type TaskStatus = 'pending' | 'running' | 'complete' | 'error' | 'aborted';

/**
 * 任务状态信息
 */
export interface TaskState {
  /** 任务唯一标识符 */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务进度 (0-100) */
  progress: number;
  /** 任务消息列表 */
  messages: string[];
  /** 关联的会话 ID */
  sessionId?: string;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 任务命令 */
  command: ClaudeCommand;
}

