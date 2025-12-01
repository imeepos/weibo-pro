import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

export enum WorkflowStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

/**
 * 工作流实体 - 与 WorkflowGraphAst 保持一致
 *
 * 设计原则：
 * - 完整保存 WorkflowGraphAst 的所有定义字段
 * - 字段结构与 AST 完全一致（不嵌套）
 * - 不包含运行时状态（state, error, count, emitCount）
 * - 运行时状态保存到 WorkflowRunEntity
 */
@Entity('workflows')
export class WorkflowEntity {
  // 数据库主键
  @PrimaryColumn()
  id!: string;

  // 对应 WorkflowGraphAst.id（业务唯一标识）
  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  // 对应 WorkflowGraphAst.name
  @Column({ type: 'varchar', length: 100, default: '未命名工作流' })
  name!: string;

  // 对应 WorkflowGraphAst.description
  @Column({ type: 'text', nullable: true })
  description?: string;

  // 对应 WorkflowGraphAst.color
  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string;

  // 对应 WorkflowGraphAst.type（固定为 "WorkflowGraphAst"）
  @Column({ type: 'varchar', length: 50, default: 'WorkflowGraphAst' })
  type!: string;

  // 对应 WorkflowGraphAst.nodes
  @Column({ type: 'jsonb', default: '[]' })
  nodes!: any[];  // INode[]

  // 对应 WorkflowGraphAst.edges
  @Column({ type: 'jsonb', default: '[]' })
  edges!: any[];  // IEdge[]

  // 对应 WorkflowGraphAst.entryNodeIds
  @Column({ type: 'jsonb', name: 'entry_node_ids', default: '[]' })
  entryNodeIds!: string[];

  // 对应 WorkflowGraphAst.position
  @Column({ type: 'jsonb', nullable: true })
  position?: { x: number; y: number };

  // 对应 WorkflowGraphAst.width
  @Column({ type: 'int', nullable: true })
  width?: number;

  // 对应 WorkflowGraphAst.viewport
  @Column({ type: 'jsonb', nullable: true })
  viewport?: { x: number; y: number; zoom: number };

  // 对应 WorkflowGraphAst.collapsed
  @Column({ type: 'boolean', default: false })
  collapsed!: boolean;

  // 对应 WorkflowGraphAst.tags
  @Index('idx_workflow_tags', { synchronize: false })
  @Column({ type: 'jsonb', default: '[]' })
  tags!: string[];

  // 工作流默认输入（模板预设）
  @Column({ type: 'jsonb', name: 'default_inputs', default: '{}' })
  defaultInputs!: Record<string, unknown>;

  // 工作流状态（业务状态，非运行时状态）
  @Index()
  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.ACTIVE,
  })
  status!: WorkflowStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

/**
 * 工作流分享实体
 *
 * 存在即合理：
 * - 管理工作流的分享链接
 * - 支持过期时间
 */
@Entity('workflow_shares')
export class WorkflowShareEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, name: 'workflow_id' })
  workflowId!: string;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
