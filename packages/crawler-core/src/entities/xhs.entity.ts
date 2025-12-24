import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('xhs_note')
@Index(['note_id'])
@Index(['time'])
export class XhsNote extends BaseContentEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  note_id!: string;

  @Column({ type: 'text', nullable: true })
  type?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'text', nullable: true })
  video_url?: string;

  @Column({ type: 'bigint', nullable: true })
  time?: number;

  @Column({ type: 'bigint', nullable: true })
  last_update_time?: number;

  @Column({ type: 'text', default: '0' })
  liked_count!: string;

  @Column({ type: 'text', default: '0' })
  collected_count!: string;

  @Column({ type: 'text', default: '0' })
  comment_count!: string;

  @Column({ type: 'text', default: '0' })
  share_count!: string;

  @Column({ type: 'text', nullable: true })
  image_list?: string;

  @Column({ type: 'text', nullable: true })
  tag_list?: string;

  @Column({ type: 'text', nullable: true })
  note_url?: string;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;

  @Column({ type: 'text', nullable: true })
  xsec_token?: string;
}

@Entity('xhs_note_comment')
@Index(['comment_id'])
@Index(['note_id'])
@Index(['create_time'])
export class XhsNoteComment extends BaseCommentEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  comment_id!: string;

  @Column({ type: 'varchar', length: 255 })
  note_id!: string;

  @Column({ type: 'bigint', nullable: true })
  create_time?: number;

  @Column({ type: 'text', nullable: true })
  pictures?: string;
}

@Entity('xhs_creator')
@Index(['user_id'])
export class XhsCreator extends BaseCreatorEntity {
  @Column({ type: 'text', default: '0' })
  interaction!: string;

  @Column({ type: 'text', nullable: true })
  tag_list?: string;
}
