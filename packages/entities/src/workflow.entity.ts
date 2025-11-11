import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

export enum WorkflowStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

interface GraphDefinition {
  nodes: unknown[];
  edges: unknown[];
}

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'jsonb', name: 'graph_definition' })
  graphDefinition!: GraphDefinition;

  @Column({ type: 'jsonb', name: 'default_inputs', default: '{}' })
  defaultInputs!: Record<string, unknown>;

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
  @Column({ type: 'int', name: 'workflow_id' })
  workflowId!: number;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
