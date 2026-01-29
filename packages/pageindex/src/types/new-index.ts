/**
 * PageIndex 核心类型统一导出
 *
 * 按照 data-structures.md 定义,使用 snake_case 命名
 * 所有类型定义的中央导出文件
 */

// 配置类型
export type { Config, ConfigInput } from './config.types.new.js';

// 节点类型
export type { Node } from './node.types.new.js';

// 结果类型
export type {
  PageToken,
  TOCItem,
  PageIndexResult,
  VerifyResult,
  IncorrectResult,
} from './result.types.new.js';

// OpenAI 类型
export type { ChatMessage, OpenAIConfig } from './openai.types.new.js';
