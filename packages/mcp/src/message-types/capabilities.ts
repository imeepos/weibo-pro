/**
 * MCP 能力定义
 */

/**
 * 客户端能力
 */
export interface ClientCapabilities {
  /**
   * 采样能力（LLM 补全）
   */
  sampling?: Record<string, any>;

  /**
   * 根目录能力
   */
  roots?: {
    listChanged?: boolean;
  };

  /**
   * 用户输入能力
   */
  elicitation?: Record<string, any>;

  /**
   * 实验性能力
   */
  experimental?: Record<string, any>;
}

/**
 * 服务器能力
 */
export interface ServerCapabilities {
  /**
   * 工具能力
   */
  tools?: {
    listChanged?: boolean;
  };

  /**
   * 资源能力
   */
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };

  /**
   * 提示词能力
   */
  prompts?: {
    listChanged?: boolean;
  };

  /**
   * 日志能力
   */
  logging?: Record<string, any>;

  /**
   * 补全能力
   */
  completion?: Record<string, any>;

  /**
   * 实验性能力
   */
  experimental?: Record<string, any>;
}
