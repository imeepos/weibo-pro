import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

interface ErrorDetail {
  message: string;
  stack?: string;
  nodeId?: string;
}

@Entity('workflow_runs')
export class WorkflowRunEntity {
  @PrimaryColumn()
  id!: string;

  @Index()
  @Column({ name: 'workflow_id' })
  workflowId!: string;

  @Index()
  @Column({ name: 'schedule_id', nullable: true })
  scheduleId?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: RunStatus,
    default: RunStatus.PENDING,
  })
  status!: RunStatus;

  @Column({ type: 'jsonb', name: 'graph_snapshot' })
  graphSnapshot!: unknown;

  @Column({ type: 'jsonb' })
  inputs!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  outputs?: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'node_states', default: '{}' })
  nodeStates!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  error?: ErrorDetail;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', name: 'duration_ms', nullable: true })
  durationMs?: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
