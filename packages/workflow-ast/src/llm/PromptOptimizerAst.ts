/**
 * 提示词优化器节点 - 自动化提示词测试与优化
 *
 * 核心功能：
 * - 接收目标输出，反向推导最优提示词
 * - 自动迭代优化，直到达到目标分数或最大迭代次数
 * - 记录完整的优化历史，支持版本回溯
 *
 * 设计哲学：
 * - 优雅即简约：从目标到方案，不做无用功
 * - 存在即合理：每次迭代都有明确的改进方向
 */

import { Ast, Input, Node, Output, State } from '@sker/workflow';

/**
 * 评估维度配置
 */
export interface EvaluationDimension {
  name: string;        // 维度名称
  weight: number;      // 权重 (0-1)
  description: string; // 描述
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  success: boolean;           // 是否成功达到目标
  iterations: number;         // 总迭代次数
  bestPrompt: string;         // 最优提示词
  bestScore: number;          // 最优分数
  versions: PromptVersionSummary[];  // 版本历史摘要
  duration: number;           // 耗时（毫秒）
}

/**
 * 版本摘要
 */
export interface PromptVersionSummary {
  versionNumber: number;
  prompt: string;
  score: number;
  improvements: string;
}

@Node({
  title: '提示词优化器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 2000,
  retryBackoff: 1.5,
})
export class PromptOptimizerAst extends Ast {
  // === 核心输入 ===

  @Input({ title: '目标输出', type: 'textarea', defaultValue: '' })
  targetOutput: string = '';

  @Input({ title: '目标上下文', type: 'textarea', defaultValue: '' })
  targetContext: string = '';

  @Input({ title: '初始提示词', type: 'textarea', defaultValue: '' })
  initialPrompt: string = '';

  // === 优化配置 ===

  @Input({ title: '最大迭代次数', type: 'number', defaultValue: 5 })
  maxIterations: number = 5;

  @Input({ title: '目标分数', type: 'number', defaultValue: 85 })
  targetScore: number = 85;

  @Input({ title: '每轮测试次数', type: 'number', defaultValue: 3 })
  testRuns: number = 3;

  @Input({
    title: '评估维度',
    type: 'object',
    defaultValue: [
      { name: '语义相似度', weight: 0.4, description: '输出与目标的语义匹配程度' },
      { name: '格式匹配', weight: 0.3, description: '输出格式是否符合目标格式' },
      { name: '关键词覆盖', weight: 0.3, description: '是否包含目标中的关键信息' },
    ],
  })
  evaluationDimensions: EvaluationDimension[] = [
    { name: '语义相似度', weight: 0.4, description: '输出与目标的语义匹配程度' },
    { name: '格式匹配', weight: 0.3, description: '输出格式是否符合目标格式' },
    { name: '关键词覆盖', weight: 0.3, description: '是否包含目标中的关键信息' },
  ];

  // === LLM 配置 ===

  @Input({ title: '生成模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  generatorModel: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '测试模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  testerModel: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '评估模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  evaluatorModel: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '生成温度', type: 'number', defaultValue: 0.7 })
  generatorTemperature: number = 0.7;

  @Input({ title: '测试温度', type: 'number', defaultValue: 0.3 })
  testerTemperature: number = 0.3;

  @Input({ title: '评估温度', type: 'number', defaultValue: 0.2 })
  evaluatorTemperature: number = 0.2;

  // === 运行时状态 ===

  @State({ title: '当前迭代' })
  currentIteration: number = 0;

  @State({ title: '版本历史' })
  versionHistory: PromptVersionSummary[] = [];

  // === 输出 ===

  @Output({ title: '优化结果', defaultValue: null })
  result: OptimizationResult | null = null;

  @Output({ title: '最优提示词', defaultValue: '' })
  bestPrompt: string = '';

  @Output({ title: '最优分数', defaultValue: 0 })
  bestScore: number = 0;

  @Output({ title: '是否成功', defaultValue: false })
  success: boolean = false;

  type: 'PromptOptimizerAst' = 'PromptOptimizerAst';
}
