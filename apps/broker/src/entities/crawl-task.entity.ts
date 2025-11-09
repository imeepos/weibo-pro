import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TaskExecutionEntity } from './task-execution.entity';

/**
 * 爬虫任务实体
 *
 * 存在即合理：
 * - 统一的任务数据存储
 * - 完整的任务生命周期管理
 * - 与执行记录的关联关系
 */
@Entity('crawl_tasks')
export class CrawlTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      'weibo_hot_timeline',
      'weibo_keyword_search',
      'weibo_user_profile',
      'weibo_post_detail',
      'weibo_comments',
      'weibo_reposts',
      'douyin_trending',
      'zhihu_hot'
    ]
  })
  type: string;

  @Column('jsonb')
  payload: any;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 5000 })
  retryDelay: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskExecutionEntity, execution => execution.task)
  executions: TaskExecutionEntity[];
}