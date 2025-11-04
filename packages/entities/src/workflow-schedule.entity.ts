import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

export enum ScheduleType {
  ONCE = 'once',
  CRON = 'cron',
  INTERVAL = 'interval',
  MANUAL = 'manual',
}

export enum ScheduleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

@Entity('workflow_schedules')
export class WorkflowScheduleEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'workflow_id' })
  workflowId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    name: 'schedule_type',
  })
  scheduleType!: ScheduleType;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'cron_expression' })
  cronExpression?: string;

  @Column({ type: 'integer', nullable: true, name: 'interval_seconds' })
  intervalSeconds?: number;

  @Column({ type: 'jsonb', default: '{}' })
  inputs!: Record<string, unknown>;

  @Index()
  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.ENABLED,
  })
  status!: ScheduleStatus;

  @Column({ type: 'timestamptz', name: 'start_time', default: () => 'CURRENT_TIMESTAMP' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time', nullable: true })
  endTime?: Date;

  @Column({ type: 'timestamptz', name: 'last_run_at', nullable: true })
  lastRunAt?: Date;

  @Index()
  @Column({ type: 'timestamptz', name: 'next_run_at', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
