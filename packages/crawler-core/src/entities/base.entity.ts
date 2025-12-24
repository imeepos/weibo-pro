import { Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', name: 'add_ts' })
  add_ts!: number;

  @Column({ type: 'bigint', name: 'last_modify_ts' })
  last_modify_ts!: number;
}

export abstract class BaseContentEntity extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  user_id?: string;

  @Column({ type: 'text', nullable: true })
  nickname?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({ type: 'text', nullable: true, default: '' })
  ip_location?: string;
}

export abstract class BaseCommentEntity extends BaseContentEntity {
  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', default: '0' })
  like_count!: string;

  @Column({ type: 'text', default: '0' })
  sub_comment_count!: string;

  @Column({ type: 'text', nullable: true })
  parent_comment_id?: string;
}

export abstract class BaseCreatorEntity extends BaseContentEntity {
  @Column({ type: 'text', nullable: true })
  desc?: string;

  @Column({ type: 'text', nullable: true })
  gender?: string;

  @Column({ type: 'text', default: '0' })
  follows!: string;

  @Column({ type: 'text', default: '0' })
  fans!: string;
}
