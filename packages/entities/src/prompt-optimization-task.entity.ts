import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 优化任务状态
 */
export enum OptimizationTaskStatus {
  PENDING = 'pending',     // 待执行
  RUNNING = 'running',     // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed',       // 失败
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 提示词优化任务实体
 *
 * 存在即合理：
 * - 管理提示词优化任务的全生命周期
 * - 记录目标输出和优化配置
 * - 追踪优化进度和最终结果
 */
@Entity('prompt_optimization_tasks')
export class PromptOptimizationTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 任务名称（用户自定义，便于识别）
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * 任务描述
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 目标输出 - 用户期望 AI 产生的输出
   * 这是反向推导提示词的基础
   */
  @Column({ type: 'text' })
  targetOutput!: string;

  /**
   * 目标输出的上下文/背景说明
   * 帮助系统更好地理解目标输出的含义
   */
  @Column({ type: 'text', nullable: true })
  targetContext?: string;

  /**
   * 目标输出的评估标准
   * JSON 格式，如：{ "语义相似度": 0.3, "格式匹配": 0.3, "关键词覆盖": 0.4 }
   */
  @Column({ type: 'jsonb', name: 'evaluation_criteria', default: '{}' })
  evaluationCriteria!: Record<string, number>;

  /**
   * 优化配置
   */
  @Column({ type: 'jsonb', name: 'optimization_config', default: '{}' })
  optimizationConfig!: {
    maxIterations: number;      // 最大优化迭代次数
    targetScore: number;        // 目标分数（达到后停止优化）
    model: string;              // 使用的 LLM 模型
    temperature: number;        // 生成温度
    testRuns: number;           // 每次迭代的测试次数
  };

  /**
   * 任务状态
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OptimizationTaskStatus,
    default: OptimizationTaskStatus.PENDING,
  })
  status!: OptimizationTaskStatus;

  /**
   * 当前迭代次数
   */
  @Column({ type: 'int', name: 'current_iteration', default: 0 })
  currentIteration!: number;

  /**
   * 当前最佳分数
   */
  @Column({ type: 'float', name: 'best_score', default: 0 })
  bestScore!: number;

  /**
   * 当前最佳提示词版本 ID
   */
  @Column({ type: 'uuid', name: 'best_version_id', nullable: true })
  bestVersionId?: string;

  /**
   * 错误信息（失败时记录）
   */
  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string;

  /**
   * 开始时间
   */
  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt?: Date;

  /**
   * 完成时间
   */
  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
