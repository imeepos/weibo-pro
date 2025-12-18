import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';

/**
 * NodeEvent 类型枚举
 * - node_runing: 节点开始执行
 * - node_emit: 节点输出属性值
 * - node_success: 节点执行成功
 * - node_fail: 节点执行失败
 */
export enum NodeEventType {
  RUNNING = 'node_runing',
  EMIT = 'node_emit',
  SUCCESS = 'node_success',
  FAIL = 'node_fail',
}

/**
 * 工作流运行事件日志
 *
 * 设计原则：
 * 1. 完全适配 NodeEvent 四种类型
 * 2. 支持事件回放（createdAt 索引）
 * 3. 支持断点续跑（复合索引 runId + eventType + nodeId）
 * 4. 最小化字段，每个字段都有存在的理由
 */
@Entity('workflow_run_logs')
@Index(['runId', 'eventType', 'nodeId']) // 断点续跑：快速查询成功节点
export class WorkflowRunLogEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'run_id' })
  runId!: number;

  @Column({ type: 'varchar', length: 64, name: 'node_id' })
  nodeId!: string;

  @Index()
  @Column({ type: 'enum', enum: NodeEventType, name: 'event_type' })
  eventType!: NodeEventType;

  /** node_emit 专用：输出属性名 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  property?: string;

  /** node_emit: 输出值 | node_runing/success/fail: INode 数据 */
  @Column({ type: 'jsonb', nullable: true })
  data?: unknown;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
