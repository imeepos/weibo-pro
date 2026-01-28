/**
 * OpenAI API 类型定义
 *
 * 按照 data-structures.md 定义,使用 snake_case 命名
 */

/**
 * OpenAI 聊天消息
 */
export interface ChatMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant';

  /** 内容 */
  content: string;
}

/**
 * OpenAI API 配置
 */
export interface OpenAIConfig {
  /** API 密钥 */
  apiKey?: string;

  /** 基础 URL */
  baseURL?: string;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 重试延迟 (毫秒) */
  retryDelay?: number;
}
