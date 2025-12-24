import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('weibo_note')
@Index(['note_id'])
@Index(['create_time'])
@Index(['create_date_time'])
export class WeiboNote extends BaseContentEntity {
  @Column({ type: 'bigint', unique: true })
  note_id!: number;

  @Column({ type: 'text', nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  profile_url?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  create_date_time?: string;

  @Column({ type: 'text', default: '0' })
  liked_count!: string;

  @Column({ type: 'text', default: '0' })
  comments_count!: string;

  @Column({ type: 'text', default: '0' })
  shared_count!: string;

  @Column({ type: 'text', nullable: true })
  note_url?: string;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;
}

@Entity('weibo_note_comment')
@Index(['comment_id'])
@Index(['note_id'])
@Index(['create_date_time'])
export class WeiboNoteComment extends BaseCommentEntity {
  @Column({ type: 'bigint', unique: true })
  comment_id!: number;

  @Column({ type: 'bigint' })
  note_id!: number;

  @Column({ type: 'text', nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  profile_url?: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  create_date_time?: string;

  @Column({ type: 'text', default: '0' })
  comment_like_count!: string;
}

@Entity('weibo_creator')
@Index(['user_id'])
export class WeiboCreator extends BaseCreatorEntity {
  @Column({ type: 'text', nullable: true })
  tag_list?: string;
}
