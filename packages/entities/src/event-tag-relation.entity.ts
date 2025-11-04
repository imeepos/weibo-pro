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
import { EventTagEntity } from './event-tag.entity';

@Entity('event_tag_relations')
@Index(['event_id', 'tag_id'], { unique: true })
@Index(['event_id'])
@Index(['tag_id'])
@Index(['relevance_score'])
export class EventTagRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'event_id' })
  event_id!: string;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  @Column({ type: 'uuid', name: 'tag_id' })
  tag_id!: string;

  @ManyToOne(() => EventTagEntity)
  @JoinColumn({ name: 'tag_id' })
  tag!: EventTagEntity;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    name: 'relevance_score',
  })
  relevance_score!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'manual',
  })
  source!: 'manual' | 'auto' | 'nlp' | 'imported';

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
