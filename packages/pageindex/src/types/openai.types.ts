/**
 * OpenAI 相关类型定义
 */

/**
 * Chat 消息角色
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Chat 消息
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * OpenAI 配置
 */
export interface OpenAIConfig {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * API 完成原因
 */
export type FinishReason = 'finished' | 'max_output_reached';
