/**
 * 故事质量循环节点 - 支持循环重写直到质量达标
 *
 * 架构设计：
 * - 支持环图：通过连线形成循环反馈
 * - 职责：收集质检反馈 + 判断是否继续重写
 * - 循环由外部连线驱动，不做内部循环
 *
 * 连线方式（环图）：
 * ```
 * StoryQualityLoop ──> chapterData ──┬──> StoryWeaver (生成章节)
 *       ↑                            │
 *       │                            └──> QualityChecker (质检)
 *       │                                       │
 *       └──────── qualityResult ───────────────┘
 * ```
 *
 * 工作原理：
 * 1. 初始：输出空的 chapterData 触发 StoryWeaver 生成
 * 2. 接收：QualityChecker 返回的质检结果
 * 3. 判断：如果质量达标或重试次数用尽，输出 finalChapter
 * 4. 循环：如果质量不达标，输出 rewriteRequest 触发重写
 */

import { Ast, Input, IS_MULTI, IS_BUFFER, Node, Output } from '@sker/workflow';
import type { QualityResult } from './QualityCheckerAst';

/**
 * 章节数据
 */
export interface ChapterData {
  chapterNumber: number;
  title: string;
  summary: string;
  content: string;
}

/**
 * 重写请求
 */
export interface RewriteRequest {
  previousContent: string;
  issues: string[];
  suggestions: string[];
  attemptNumber: number;
}

@Node({ type: 'control', title: '故事质量循环' })
export class StoryQualityLoopAst extends Ast {
  // === 输入配置 ===

  @Input({ title: '最低质量分数', defaultValue: 70 })
  minQualityScore: number = 70;

  @Input({ title: '最大重试次数', defaultValue: 3 })
  maxRetries: number = 3;

  @Input({ mode: IS_BUFFER | IS_MULTI, title: '质检结果', defaultValue: [] })
  qualityResults: QualityResult[] = [];

  // === 输出端口 ===

  @Output({ title: '重写请求（循环）', isRouter: true, defaultValue: undefined })
  rewriteRequest: RewriteRequest | undefined = undefined;

  @Output({ title: '最终章节', isRouter: true, defaultValue: undefined })
  finalChapter: ChapterData | undefined = undefined;

  @Output({ title: '当前尝试次数', defaultValue: 0 })
  currentAttempt = 0;

  @Output({ title: '是否完成', defaultValue: false })
  isComplete = false;

  type: 'StoryQualityLoopAst' = 'StoryQualityLoopAst';
}
