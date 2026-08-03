/**
 * MCP 通知
 */

/**
 * 通知方法名称
 */
export type NotificationMethod =
  // 双向
  | 'notifications/cancelled'
  | 'notifications/progress'
  // 客户端 → 服务器
  | 'notifications/initialized'
  | 'notifications/roots/list_changed'
  // 服务器 → 客户端
  | 'notifications/message'
  | 'notifications/resources/updated'
  | 'notifications/resources/list_changed'
  | 'notifications/tools/list_changed'
  | 'notifications/prompts/list_changed';

/**
 * notifications/initialized 参数
 */
export interface InitializedParams {
  // 无参数
}

/**
 * notifications/cancelled 参数
 */
export interface CancelledParams {
  requestId: string | number;
  reason?: string;
}

/**
 * notifications/progress 参数
 */
export interface ProgressParams {
  progressToken: string | number;
  progress: number;
  total?: number;
}

/**
 * notifications/message 参数（日志）
 */
export interface LoggingMessageParams {
  level: 'debug' | 'info' | 'warning' | 'error';
  logger?: string;
  data: any;
}

/**
 * notifications/resources/updated 参数
 */
export interface ResourceUpdatedParams {
  uri: string;
}

/**
 * notifications/resources/list_changed 参数
 */
export interface ResourceListChangedParams {
  // 无参数
}

/**
 * notifications/tools/list_changed 参数
 */
export interface ToolListChangedParams {
  // 无参数
}

/**
 * notifications/prompts/list_changed 参数
 */
export interface PromptListChangedParams {
  // 无参数
}

/**
 * notifications/roots/list_changed 参数
 */
export interface RootsListChangedParams {
  // 无参数
}
