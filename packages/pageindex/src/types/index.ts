/**
 * PageIndex 类型定义统一导出
 *
 * 所有类型定义的中央导出文件
 * 同时导出 camelCase (旧) 和 snake_case (新) 两种命名风格
 */

// ============================================
// snake_case 类型 (按照 data-structures.md)
// ============================================
// 配置类型
export type {
  Config as ConfigSnake,
  ConfigInput as ConfigInputSnake,
} from './config.types.new.js';

// 节点类型
export type { Node as NodeSnake } from './node.types.new.js';

// 结果类型
export type {
  PageToken as PageTokenSnake,
  TOCItem as TOCItemSnake,
  PageIndexResult as PageIndexResultSnake,
  VerifyResult as VerifyResultSnake,
  IncorrectResult as IncorrectResultSnake,
} from './result.types.new.js';

// OpenAI 类型
export type {
  ChatMessage as ChatMessageSnake,
  OpenAIConfig as OpenAIConfigSnake,
} from './openai.types.new.js';

// ============================================
// camelCase 类型 (原有类型,保持向后兼容)
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
  DocumentMetadata,
} from './result.types.js';

// OpenAI类型
export type {
  ChatRole,
  ChatMessage,
  OpenAIConfig,
  FinishReason,
} from './openai.types.js';
