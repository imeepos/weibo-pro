/**
 * @fileoverview 流式聚合器共享类型定义
 * @description 定义流式聚合过程中使用的内部累积类型
 * @version 2.0
 */

import type { UnifiedContent, UnifiedResponseAst } from '../ast';

/**
 * 聚合过程中的累积响应类型
 * 在 UnifiedResponseAst 基础上携带内部内容块缓冲区 _contentBlocks，
 * 用于在流式事件到达时暂存内容，最终化时复制到 content 字段。
 */
export type UnifiedResponseAccumulator = UnifiedResponseAst & {
  _contentBlocks: UnifiedContent[];
};
