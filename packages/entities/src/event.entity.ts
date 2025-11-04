import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventCategoryEntity } from './event-category.entity';
import { type SentimentScore } from './types/sentiment';

@Entity('events')
@Index(['category_id'])
@Index(['hotness'])
@Index(['created_at'])
@Index(['status'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', name: 'category_id' })
  category_id!: string;

  @ManyToOne(() => EventCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: EventCategoryEntity;

  @Column({ type: 'jsonb', name: 'sentiment' })
  sentiment!: SentimentScore;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hotness!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
  })
  status!: 'active' | 'inactive' | 'archived';

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'seed_url' })
  seed_url!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'occurred_at' })
  occurred_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'peak_at' })
  peak_at!: Date | null;

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

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deleted_at!: Date | null;

  get source_platform(): string | null {
    if (!this.seed_url) return null;
    try {
      const hostname = new URL(this.seed_url).hostname;
      if (hostname.includes('weibo.com')) return 'weibo';
      if (hostname.includes('twitter.com')) return 'twitter';
      if (hostname.includes('news')) return 'news';
      return 'other';
    } catch {
      return null;
    }
  }
}
