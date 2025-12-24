import { Entity, Column, Index } from 'typeorm';
import { BaseContentEntity, BaseCommentEntity, BaseCreatorEntity } from './base.entity';

@Entity('tieba_note')
@Index(['note_id'])
@Index(['publish_time'])
export class TiebaNote extends BaseContentEntity {
  @Column({ type: 'varchar', length: 644, unique: true })
  note_id!: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'text', nullable: true })
  note_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publish_time?: string;

  @Column({ type: 'text', default: '' })
  user_link!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  tieba_id!: string;

  @Column({ type: 'text', nullable: true })
  tieba_name?: string;

  @Column({ type: 'text', nullable: true })
  tieba_link?: string;

  @Column({ type: 'integer', default: 0 })
  total_replay_num!: number;

  @Column({ type: 'integer', default: 0 })
  total_replay_page!: number;

  @Column({ type: 'text', default: '' })
  source_keyword!: string;
}

@Entity('tieba_comment')
@Index(['comment_id'])
@Index(['note_id'])
@Index(['publish_time'])
export class TiebaComment extends BaseCommentEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  comment_id!: string;

  @Column({ type: 'varchar', length: 255 })
  note_id!: string;

  @Column({ type: 'text', default: '' })
  user_link!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  tieba_id!: string;

  @Column({ type: 'text', nullable: true })
  tieba_name?: string;

  @Column({ type: 'text', nullable: true })
  tieba_link?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publish_time?: string;

  @Column({ type: 'text', nullable: true })
  note_url?: string;

  @Column({ type: 'integer', default: 0 })
  sub_comment_count_int!: number;
}

@Entity('tieba_creator')
@Index(['user_id'])
export class TiebaCreator extends BaseCreatorEntity {
  @Column({ type: 'text', nullable: true })
  user_name?: string;

  @Column({ type: 'text', nullable: true })
  registration_duration?: string;
}
