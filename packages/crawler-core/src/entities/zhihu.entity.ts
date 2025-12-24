import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('zhihu_content')
@Index(['content_id'])
@Index(['created_time'])
export class ZhihuContent extends BaseContentEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  content_id!: string;

  @Column({ type: 'text', nullable: true })
  content_type?: string;

  @Column({ type: 'text', nullable: true })
  content_text?: string;

  @Column({ type: 'text', nullable: true })
  content_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  question_id?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  created_time?: string;

  @Column({ type: 'text', nullable: true })
  updated_time?: string;

  @Column({ type: 'integer', default: 0 })
  voteup_count!: number;

  @Column({ type: 'integer', default: 0 })
  comment_count!: number;

  @Column({ type: 'text', nullable: true })
  source_keyword?: string;

  @Column({ type: 'text', nullable: true })
  user_link?: string;

  @Column({ type: 'text', nullable: true })
  user_url_token?: string;
}

@Entity('zhihu_comment')
@Index(['comment_id'])
@Index(['content_id'])
@Index(['publish_time'])
export class ZhihuComment extends BaseCommentEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  comment_id!: string;

  @Column({ type: 'varchar', length: 64 })
  content_id!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parent_comment_id_str?: string;

  @Column({ type: 'text', nullable: true })
  content_type?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  publish_time?: string;

  @Column({ type: 'integer', default: 0 })
  like_count_int!: number;

  @Column({ type: 'integer', default: 0 })
  dislike_count!: number;

  @Column({ type: 'integer', default: 0 })
  sub_comment_count_int!: number;

  @Column({ type: 'text', nullable: true })
  user_link?: string;
}

@Entity('zhihu_creator')
@Index(['user_id'])
export class ZhihuCreator extends BaseCreatorEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  user_id_unique!: string;

  @Column({ type: 'text', nullable: true })
  user_link?: string;

  @Column({ type: 'text', nullable: true })
  url_token?: string;

  @Column({ type: 'integer', default: 0 })
  follows_int!: number;

  @Column({ type: 'integer', default: 0 })
  fans_int!: number;

  @Column({ type: 'integer', default: 0 })
  anwser_count!: number;

  @Column({ type: 'integer', default: 0 })
  video_count!: number;

  @Column({ type: 'integer', default: 0 })
  question_count!: number;

  @Column({ type: 'integer', default: 0 })
  article_count!: number;

  @Column({ type: 'integer', default: 0 })
  column_count!: number;

  @Column({ type: 'integer', default: 0 })
  get_voteup_count!: number;
}
