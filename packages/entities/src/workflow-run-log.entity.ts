import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Entity('workflow_run_logs')
export class WorkflowRunLogEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'run_id' })
  runId!: number;

  @Column({ type: 'varchar', length: 64, name: 'node_id', nullable: true })
  nodeId?: string;

  @Index()
  @Column({ type: 'enum', enum: LogLevel })
  level!: LogLevel;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, unknown>;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
