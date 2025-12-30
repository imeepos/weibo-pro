import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 统计进度追踪表
 * 用于记录各类关系统计的增量处理进度
 */
@Entity('statistics_progress')
export class StatisticsProgress {
  @PrimaryGeneratedColumn('increment')
  id: string;

  /**
   * 关系类型
   * 对应 UserRelationType: repost, comment, like
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  relationType: string;

  /**
   * 最后处理的源表记录ID
   * - repost: weibo_reposts.id
   * - comment: weibo_comments.id
   * - like: weibo_likes.id
   */
  @Column({ type: 'bigint', default: '0' })
  lastProcessedId: string;

  /**
   * 最后处理时间
   */
  @Column({ type: 'timestamptz', nullable: true })
  lastProcessedAt: Date;

  /**
   * 本次处理的记录数
   */
  @Column({ type: 'integer', default: 0 })
  processedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
