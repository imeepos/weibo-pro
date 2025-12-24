import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity } from './base.entity';

@Entity('kuaishou_video')
@Index(['video_id'])
@Index(['create_time'])
export class KuaishouVideo extends BaseContentEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  video_id!: string;

  @Column({ type: 'text', nullable: true })
  video_type?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'text', default: '0' })
  liked_count!: string;

  @Column({ type: 'text', default: '0' })
  viewd_count!: string;

  @Column({ type: 'text', nullable: true })
  video_url?: string;

  @Column({ type: 'text', nullable: true })
  video_cover_url?: string;

  @Column({ type: 'text', nullable: true })
  video_play_url?: string;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;
}

@Entity('kuaishou_video_comment')
@Index(['comment_id'])
@Index(['video_id'])
export class KuaishouVideoComment extends BaseCommentEntity {
  @Column({ type: 'bigint', unique: true })
  comment_id!: number;

  @Column({ type: 'varchar', length: 255 })
  video_id!: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;
}
