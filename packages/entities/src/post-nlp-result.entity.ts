import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventEntity } from './event.entity';
import { WeiboPostEntity } from './weibo-post.entity';

interface Sentiment {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
  positive_prob: number;
  negative_prob: number;
  neutral_prob: number;
}

interface Keyword {
  keyword: string;
  weight: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  pos: string;
  count: number;
}

interface EventType {
  type: string;
  confidence: number;
}

@Entity('post_nlp_results')
@Index(['post_id'])
@Index(['event_id'])
@Index(['created_at'])
export class PostNLPResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'post_id' })
  post_id!: string;

  @ManyToOne(() => WeiboPostEntity)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' })
  post!: WeiboPostEntity;

  @Column({ type: 'uuid', name: 'event_id', nullable: true })
  event_id!: string | null;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity | null;

  @Column({ type: 'jsonb', name: 'sentiment' })
  sentiment!: Sentiment;

  @Column({ type: 'jsonb', name: 'keywords' })
  keywords!: Keyword[];

  @Column({ type: 'jsonb', name: 'event_type' })
  event_type!: EventType;

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
