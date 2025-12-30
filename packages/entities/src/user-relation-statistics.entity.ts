import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Entity } from './decorator';

export enum UserRelationType {
  REPOST = 'repost',
  COMMENT = 'comment',
  LIKE = 'like',
}

@Entity('user_relation_statistics')
@Index(['sourceUserId', 'targetUserId', 'relationType'], { unique: true })
@Index(['relationType'])
@Index(['lastProcessedAt'])
export class UserRelationStatistics {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'source_user_id', type: 'bigint', comment: '源用户ID' })
  sourceUserId!: string;

  @Column({ name: 'target_user_id', type: 'bigint', comment: '目标用户ID' })
  targetUserId!: string;

  @Column({
    name: 'relation_type',
    type: 'varchar',
    length: 20,
    comment: '关系类型: repost, comment, like',
  })
  relationType!: UserRelationType;

  @Column({ type: 'int', default: 0, comment: '互动次数/权重' })
  weight!: number;

  @Column({
    name: 'first_interaction_at',
    type: 'timestamp',
    nullable: true,
    comment: '首次交互时间',
  })
  firstInteractionAt!: Date | null;

  @Column({
    name: 'last_interaction_at',
    type: 'timestamp',
    nullable: true,
    comment: '最后交互时间',
  })
  lastInteractionAt!: Date | null;

  @Column({
    name: 'last_processed_id',
    type: 'bigint',
    nullable: true,
    comment: '最后处理的源表记录ID，用于增量更新',
  })
  lastProcessedId!: string | null;

  @Column({
    name: 'last_processed_at',
    type: 'timestamp',
    nullable: true,
    comment: '最后统计处理时间',
  })
  lastProcessedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
