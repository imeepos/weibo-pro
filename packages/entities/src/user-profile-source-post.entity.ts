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
import { WeiboPostEntity } from './weibo-post.entity';
import { WeiboUserEntity } from './weibo-user.entity';
import { UserProfileDistillationTaskEntity } from './user-profile-distillation-task.entity';

@Entity('user_profile_source_posts')
@Index(['weibo_user_id', 'post_id'], { unique: true })
@Index(['weibo_user_id'])
@Index(['post_created_at'])
export class UserProfileSourcePostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'weibo_user_id' })
  weibo_user_id!: string;

  @ManyToOne(() => WeiboUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weibo_user_id', referencedColumnName: 'id' })
  weiboUser!: WeiboUserEntity;

  @Column({ type: 'bigint', name: 'post_id' })
  post_id!: string;

  @ManyToOne(() => WeiboPostEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' })
  post!: WeiboPostEntity;

  @Column({ type: 'varchar', length: 32, name: 'source_kind', default: 'post' })
  source_kind!: 'post';

  @Column({ type: 'timestamptz', name: 'post_created_at', nullable: true })
  post_created_at!: Date | null;

  @Column({ type: 'varchar', length: 128, name: 'content_fingerprint' })
  content_fingerprint!: string;

  @Column({ type: 'text', name: 'normalized_text' })
  normalized_text!: string;

  @Column({ type: 'jsonb', name: 'source_snapshot' })
  source_snapshot!: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'first_seen_at' })
  first_seen_at!: Date;

  @Column({ type: 'timestamptz', name: 'last_seen_at' })
  last_seen_at!: Date;

  @Column({ type: 'uuid', name: 'latest_task_id', nullable: true })
  latest_task_id!: string | null;

  @ManyToOne(() => UserProfileDistillationTaskEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'latest_task_id' })
  latestTask!: UserProfileDistillationTaskEntity | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
