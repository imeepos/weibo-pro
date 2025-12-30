import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Entity } from './decorator';

export enum StatisticsPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

@Entity('overview_statistics')
@Index(['period', 'periodStart'], { unique: true })
@Index(['periodStart'])
export class OverviewStatistics {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    name: 'period',
    type: 'varchar',
    length: 20,
    comment: '统计周期: hourly, daily',
  })
  period!: StatisticsPeriod;

  @Column({
    name: 'period_start',
    type: 'timestamp',
    comment: '周期开始时间',
  })
  periodStart!: Date;

  @Column({ name: 'event_count', type: 'int', default: 0, comment: '事件数量' })
  eventCount!: number;

  @Column({ name: 'post_count', type: 'int', default: 0, comment: '帖子数量' })
  postCount!: number;

  @Column({ name: 'user_count', type: 'int', default: 0, comment: '活跃用户数' })
  userCount!: number;

  @Column({ name: 'comment_count', type: 'int', default: 0, comment: '评论数' })
  commentCount!: number;

  @Column({ name: 'like_count', type: 'int', default: 0, comment: '点赞数' })
  likeCount!: number;

  @Column({ name: 'repost_count', type: 'int', default: 0, comment: '转发数' })
  repostCount!: number;

  @Column({ name: 'interaction_count', type: 'int', default: 0, comment: '互动总数' })
  interactionCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
