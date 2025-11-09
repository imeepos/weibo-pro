import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrawlTaskEntity } from './crawl-task.entity';

/**
 * 任务执行记录实体
 *
 * 存在即合理：
 * - 完整的执行历史记录
 * - 详细的错误跟踪
 * - 与任务的关联关系
 */
@Entity('task_executions')
export class TaskExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => CrawlTaskEntity, task => task.executions)
  @JoinColumn({ name: 'taskId' })
  task: CrawlTaskEntity;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled']
  })
  status: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  result: any;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 0 })
  executionTime: number;

  @Column({ type: 'text', nullable: true })
  workerId: string;

  @Column({ type: 'text', nullable: true })
  queueName: string;

  @CreateDateColumn()
  createdAt: Date;
}