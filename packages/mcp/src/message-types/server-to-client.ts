/**
 * 服务器 → 客户端：请求方法
 */

/**
 * 服务器到客户端的请求方法名称
 */
export type ServerToClientMethod =
  | 'sampling/createMessage'
  | 'roots/list'
  | 'elicitation/create';

/**
 * sampling/createMessage 请求参数
 */
export interface CreateMessageParams {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

/**
 * sampling/createMessage 响应结果
 */
export interface CreateMessageResult {
  role: 'assistant';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  };
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

/**
 * roots/list 响应结果
 */
export interface ListRootsResult {
  roots: Array<{
    uri: string;
    name?: string;
  }>;
}

/**
 * elicitation/create 请求参数
 */
export interface CreateElicitationParams {
  prompt: string;
  mode?: 'form' | 'url';
  fields?: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    label?: string;
    description?: string;
    required?: boolean;
    options?: string[];
  }>;
}

/**
 * elicitation/create 响应结果
 */
export interface CreateElicitationResult {
  data: Record<string, any>;
}
