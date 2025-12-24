import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('bilibili_video')
@Index(['video_id'])
@Index(['user_id'])
@Index(['create_time'])
export class BilibiliVideo extends BaseContentEntity {
  @Column({ type: 'bigint', unique: true })
  video_id!: number;

  @Column({ type: 'text' })
  video_url!: string;

  @Column({ type: 'text', nullable: true })
  video_type?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'integer', default: 0 })
  liked_count!: number;

  @Column({ type: 'text', default: '0' })
  disliked_count!: string;

  @Column({ type: 'text', default: '0' })
  video_play_count!: string;

  @Column({ type: 'text', default: '0' })
  video_favorite_count!: string;

  @Column({ type: 'text', default: '0' })
  video_share_count!: string;

  @Column({ type: 'text', default: '0' })
  video_coin_count!: string;

  @Column({ type: 'text', default: '0' })
  video_danmaku!: string;

  @Column({ type: 'text', default: '0' })
  video_comment!: string;

  @Column({ type: 'text', nullable: true })
  video_cover_url?: string;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;
}

@Entity('bilibili_video_comment')
@Index(['comment_id'])
@Index(['video_id'])
export class BilibiliVideoComment extends BaseCommentEntity {
  @Column({ type: 'bigint', unique: true })
  comment_id!: number;

  @Column({ type: 'bigint' })
  video_id!: number;

  @Column({ type: 'text', nullable: true })
  sex?: string;

  @Column({ type: 'text', nullable: true })
  sign?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;
}

@Entity('bilibili_up_info')
@Index(['user_id'])
export class BilibiliUpInfo extends BaseCreatorEntity {
  @Column({ type: 'text', nullable: true })
  sex?: string;

  @Column({ type: 'text', nullable: true })
  sign?: string;

  @Column({ type: 'integer', default: 0 })
  total_fans!: number;

  @Column({ type: 'integer', default: 0 })
  total_liked!: number;

  @Column({ type: 'integer', default: 0 })
  user_rank!: number;

  @Column({ type: 'integer', default: 0 })
  is_official!: number;
}
