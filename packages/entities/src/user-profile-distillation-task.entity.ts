import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventEntity } from './event.entity';
import { WeiboUserEntity } from './weibo-user.entity';

export type UserProfileDistillationTaskStatus =
  | 'queued'
  | 'crawling'
  | 'extracting'
  | 'aggregating'
  | 'publishing'
  | 'analyzing'
  | 'review_pending'
  | 'published'
  | 'failed';

export type UserProfileDistillationReviewStatus =
  | 'auto_pass'
  | 'human_pending'
  | 'human_approved'
  | 'human_rejected';

@Entity('user_profile_distillation_tasks')
@Index(['weibo_user_id'])
@Index(['event_id'])
@Index(['status'])
@Index(['review_status'])
@Index(['created_at'])
export class UserProfileDistillationTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'weibo_user_id' })
  weibo_user_id!: string;

  @ManyToOne(() => WeiboUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weibo_user_id', referencedColumnName: 'id' })
  weiboUser!: WeiboUserEntity;

  @Column({ type: 'uuid', name: 'event_id', nullable: true })
  event_id!: string | null;

  @ManyToOne(() => EventEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity | null;

  @Column({ type: 'varchar', length: 32, default: 'queued' })
  status!: UserProfileDistillationTaskStatus;

  @Column({ type: 'integer', name: 'history_window_days', default: 90 })
  history_window_days!: number;

  @Column({ type: 'integer', name: 'source_post_count', default: 0 })
  source_post_count!: number;

  @Column({ type: 'integer', name: 'source_comment_count', default: 0 })
  source_comment_count!: number;

  @Column({ type: 'integer', name: 'source_repost_count', default: 0 })
  source_repost_count!: number;

  @Column({ type: 'integer', name: 'evidence_sample_count', default: 0 })
  evidence_sample_count!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'prompt_version', nullable: true })
  prompt_version!: string | null;

  @Column({ type: 'text', name: 'distilled_summary', nullable: true })
  distilled_summary!: string | null;

  @Column({ type: 'jsonb', name: 'distilled_json', nullable: true })
  distilled_json!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'progress_json', nullable: true })
  progress_json!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'warnings_json', nullable: true })
  warnings_json!: string[] | null;

  @Column({ type: 'varchar', length: 32, name: 'review_status', nullable: true })
  review_status!: UserProfileDistillationReviewStatus | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message!: string | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completed_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
