import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventEntity } from './event.entity';
import { type SentimentScore, TrendMetrics } from './types/sentiment';

@Entity('event_statistics')
@Index(['event_id', 'snapshot_at'], { unique: true })
@Index(['event_id'])
@Index(['snapshot_at'])
@Index(['granularity'])
export class EventStatisticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'event_id' })
  event_id!: string;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  @Column({ type: 'integer', default: 0, name: 'post_count' })
  post_count!: number;

  @Column({ type: 'integer', default: 0, name: 'user_count' })
  user_count!: number;

  @Column({ type: 'integer', default: 0, name: 'comment_count' })
  comment_count!: number;

  @Column({ type: 'integer', default: 0, name: 'repost_count' })
  repost_count!: number;

  @Column({ type: 'integer', default: 0, name: 'like_count' })
  like_count!: number;

  @Column({ type: 'jsonb', name: 'sentiment' })
  sentiment!: SentimentScore;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hotness!: number;

  @Column({ type: 'jsonb', name: 'trend_metrics', nullable: true })
  trend_metrics!: TrendMetrics | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'hourly',
  })
  granularity!: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'timestamptz', name: 'snapshot_at' })
  snapshot_at!: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
