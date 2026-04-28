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
import { UserProfileSourcePostEntity } from './user-profile-source-post.entity';
import { WeiboUserEntity } from './weibo-user.entity';
import { UserProfileDistillationTaskEntity } from './user-profile-distillation-task.entity';

export type UserProfilePostExtractionStatus = 'pending' | 'succeeded' | 'failed';

@Entity('user_profile_post_extractions')
@Index(['source_post_id', 'extractor_version'], { unique: true })
@Index(['weibo_user_id'])
@Index(['status'])
export class UserProfilePostExtractionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'source_post_id' })
  source_post_id!: string;

  @ManyToOne(() => UserProfileSourcePostEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_post_id' })
  sourcePost!: UserProfileSourcePostEntity;

  @Column({ type: 'bigint', name: 'weibo_user_id' })
  weibo_user_id!: string;

  @ManyToOne(() => WeiboUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weibo_user_id', referencedColumnName: 'id' })
  weiboUser!: WeiboUserEntity;

  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  task_id!: string | null;

  @ManyToOne(() => UserProfileDistillationTaskEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task!: UserProfileDistillationTaskEntity | null;

  @Column({ type: 'varchar', length: 64, name: 'extractor_version' })
  extractor_version!: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: UserProfilePostExtractionStatus;

  @Column({ type: 'integer', name: 'attempt_count', default: 0 })
  attempt_count!: number;

  @Column({ type: 'text', name: 'extracted_summary', nullable: true })
  extracted_summary!: string | null;

  @Column({ type: 'jsonb', name: 'extracted_json', nullable: true })
  extracted_json!: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message!: string | null;

  @Column({ type: 'timestamptz', name: 'last_extracted_at', nullable: true })
  last_extracted_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
