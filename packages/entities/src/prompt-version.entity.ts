import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 提示词版本实体
 *
 * 存在即合理：
 * - 记录每次优化迭代产生的提示词版本
 * - 保存测试结果和评分详情
 * - 支持版本回溯和对比分析
 */
@Entity('prompt_versions')
export class PromptVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 所属优化任务 ID
   */
  @Index()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId!: string;

  /**
   * 版本号（从 1 开始递增）
   */
  @Column({ type: 'int', name: 'version_number' })
  versionNumber!: number;

  /**
   * 提示词内容
   */
  @Column({ type: 'text' })
  prompt!: string;

  /**
   * 生成这个版本时的优化策略/思路
   * AI 解释为什么这样优化
   */
  @Column({ type: 'text', name: 'optimization_rationale', nullable: true })
  optimizationRationale?: string;

  /**
   * 测试结果 - 使用该提示词调用 AI 后的实际输出
   * 可能有多次测试，存储为数组
   */
  @Column({ type: 'jsonb', name: 'test_outputs', default: '[]' })
  testOutputs!: string[];

  /**
   * 各维度评分详情
   * { "语义相似度": 85, "格式匹配": 90, "关键词覆盖": 80 }
   */
  @Column({ type: 'jsonb', name: 'dimension_scores', default: '{}' })
  dimensionScores!: Record<string, number>;

  /**
   * 综合评分（加权平均）
   */
  @Column({ type: 'float', name: 'total_score', default: 0 })
  totalScore!: number;

  /**
   * 评估反馈 - AI 对测试结果的分析
   */
  @Column({ type: 'text', name: 'evaluation_feedback', nullable: true })
  evaluationFeedback?: string;

  /**
   * 改进建议 - 为下一轮优化提供的建议
   */
  @Column({ type: 'text', name: 'improvement_suggestions', nullable: true })
  improvementSuggestions?: string;

  /**
   * 父版本 ID（第一个版本为 null）
   */
  @Column({ type: 'uuid', name: 'parent_version_id', nullable: true })
  parentVersionId?: string;

  /**
   * 是否为最佳版本（任务完成时标记）
   */
  @Column({ type: 'boolean', name: 'is_best', default: false })
  isBest!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
