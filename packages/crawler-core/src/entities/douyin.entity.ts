import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('douyin_aweme')
@Index(['aweme_id'])
@Index(['create_time'])
export class DouyinAweme extends BaseContentEntity {
  @Column({ type: 'bigint', unique: true })
  aweme_id!: number;

  @Column({ type: 'text', nullable: true })
  sec_uid?: string;

  @Column({ type: 'text', nullable: true })
  short_user_id?: string;

  @Column({ type: 'text', nullable: true })
  user_unique_id?: string;

  @Column({ type: 'text', nullable: true })
  user_signature?: string;

  @Column({ type: 'text', nullable: true })
  aweme_type?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'text', default: '0' })
  liked_count!: string;

  @Column({ type: 'text', default: '0' })
  comment_count!: string;

  @Column({ type: 'text', default: '0' })
  share_count!: string;

  @Column({ type: 'text', default: '0' })
  collected_count!: string;

  @Column({ type: 'text', nullable: true })
  aweme_url?: string;

  @Column({ type: 'text', nullable: true })
  cover_url?: string;

  @Column({ type: 'text', nullable: true })
  video_download_url?: string;

  @Column({ type: 'text', nullable: true })
  music_download_url?: string;

  @Column({ type: 'text', nullable: true })
  note_download_url?: string;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;
}

@Entity('douyin_aweme_comment')
@Index(['comment_id'])
@Index(['aweme_id'])
export class DouyinAwemeComment extends BaseCommentEntity {
  @Column({ type: 'bigint', unique: true })
  comment_id!: number;

  @Column({ type: 'bigint' })
  aweme_id!: number;

  @Column({ type: 'text', nullable: true })
  sec_uid?: string;

  @Column({ type: 'text', nullable: true })
  short_user_id?: string;

  @Column({ type: 'text', nullable: true })
  user_unique_id?: string;

  @Column({ type: 'text', nullable: true })
  user_signature?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'text', default: '' })
  pictures!: string;
}

@Entity('dy_creator')
@Index(['user_id'])
export class DyCreator extends BaseCreatorEntity {
  @Column({ type: 'text', default: '0' })
  interaction!: string;

  @Column({ type: 'text', default: '0' })
  videos_count!: string;
}
