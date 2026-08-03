/**
 * PageIndex 类型定义统一导出
 *
 * 所有类型定义的中央导出文件
 */

// ============================================
// camelCase 类型（权威版本）
// ============================================

// 配置类型
export type {
  PDFConfig,
  MarkdownConfig,
  Config,
} from './config.types.js';
export type { isPDFConfig, isMarkdownConfig } from './config.types.js';

// 节点类型
export type {
  Node,
  FlatNodeList,
  TreeStructure,
  NodeWithListIndex,
} from './node.types.js';

// 结果类型
export type {
  DocumentResult,
  PageToken,
  PageTokenTuple,
  TOCResult,
  TOCDetectionResult,
  TitleVerificationResult,
  TOCItem,
  PageIndexResult,
  DocumentMetadata,
} from './result.types.js';

// OpenAI类型
export type {
  ChatRole,
  ChatMessage,
  OpenAIConfig,
  FinishReason,
} from './openai.types.js';
