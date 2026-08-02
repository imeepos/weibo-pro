/**
 * 质量检查器节点 - 评估章节质量
 *
 * 职责：
 * - 使用 LLM 评估章节质量（字数、情节、文笔、逻辑等维度）
 * - 输出质量分数和改进建议
 * - 支持与 StoryQualityLoopAst 配合实现循环重写
 */

import { Ast, Input, Node, Output } from '@sker/workflow';

export interface QualityDimension {
  name: string;           // 维度名称（如：字数达标、情节连贯）
  score: number;          // 该维度分数（0-100）
  weight: number;         // 权重（0-1）
  issues?: string[];      // 问题列表
}

export interface QualityResult {
  score: number;           // 综合质量分数（0-100）
  passed: boolean;         // 是否通过
  dimensions: QualityDimension[];  // 各维度评分
  issues: string[];        // 总体质量问题
  suggestions: string[];   // 改进建议
  timestamp: string;       // 检查时间
  chapter: any;            // 原始章节数据（用于循环反馈）
}

@Node({
  title: '质量检查器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 2
})
export class QualityCheckerAst extends Ast {
  // === 输入 ===

  @Input({ title: '章节数据', defaultValue: null })
  chapter: any = null;

  @Input({ title: '最低分数', type: 'number', defaultValue: 70 })
  minScore: number = 70;

  @Input({ title: '评估维度', type: 'object', defaultValue: [
    { name: '字数达标', weight: 0.15, description: '字数是否符合要求，偏差不超过±20%' },
    { name: '情节推进', weight: 0.25, description: '是否有实质性情节推进，避免原地踏步' },
    { name: '人物刻画', weight: 0.20, description: '人物是否有状态变化，避免沦为"反应机器"' },
    { name: '文笔质量', weight: 0.20, description: '语言流畅度、细节描写、氛围营造' },
    { name: '逻辑一致', weight: 0.20, description: '世界观、设定、人物能力是否保持一致' }
  ] })
  dimensions: Array<{ name: string; weight: number; description: string }> = [];

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '温度', defaultValue: 0.3 })
  temperature: number = 0.3;  // 质检需要更客观，温度设低

  // === 输出 ===

  @Output({ title: '质检结果', defaultValue: null })
  result: QualityResult | null = null;

  @Output({ title: '质量分数', defaultValue: 0 })
  score: number = 0;

  @Output({ title: '是否通过', defaultValue: false })
  passed: boolean = false;

  type = 'QualityCheckerAst';
}
