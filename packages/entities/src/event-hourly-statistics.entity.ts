import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventEntity } from './event.entity';

/**
 * 事件小时级统计表
 *
 * 注意：这是统计表，不是快照表
 * - 统计 posts、comments、likes、reposts、nlp_results 等表中的真实数据
 * - 支持幂等写入，同一小时数据可重复聚合
 * - 热度值为计算字段：post_count、comment_count、repost_count、like_count、user_count 的加权值
 */
@Entity('event_hourly_statistics')
@Index(['event_id', 'year', 'month', 'day', 'hour'], { unique: true })
@Index(['event_id'])
@Index(['year', 'month', 'day'])
export class EventHourlyStatisticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'event_id' })
  event_id!: string;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  @Column({ type: 'smallint', name: 'year' })
  year!: number;

  @Column({ type: 'smallint', name: 'month' })
  month!: number;

  @Column({ type: 'smallint', name: 'day', comment: '注意这里存储的是 UTC时间，北京时间需要+8' })
  day!: number;

  @Column({ type: 'smallint', name: 'hour' })
  hour!: number;

  @Column({ type: 'integer', default: 0, name: 'post_count', comment: '帖子数量，来自 weibo_posts 表' })
  post_count!: number;

  @Column({ type: 'integer', default: 0, name: 'comment_count', comment: '评论数量，来自 weibo_comments 表' })
  comment_count!: number;

  @Column({ type: 'integer', default: 0, name: 'repost_count', comment: '转发数量，来自 weibo_reposts 表' })
  repost_count!: number;

  @Column({ type: 'integer', default: 0, name: 'like_count', comment: '点赞数量，来自 weibo_likes 表' })
  like_count!: number;

  @Column({ type: 'integer', default: 0, name: 'user_count', comment: '去重用户数' })
  user_count!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '热度值，由 post_count、comment_count、repost_count、like_count、user_count 加权计算' })
  hotness!: number;

  @Column({ type: 'integer', default: 0, name: 'nlp_count', comment: 'NLP 结果数量，用于情感增量计算' })
  nlp_count!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'sentiment_positive', comment: '正面情感评分，来自 post_nlp_results 表聚合' })
  sentiment_positive!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'sentiment_negative', comment: '负面情感评分，来自 post_nlp_results 表聚合' })
  sentiment_negative!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1, name: 'sentiment_neutral', comment: '中性情感评分，来自 post_nlp_results 表聚合' })
  sentiment_neutral!: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
