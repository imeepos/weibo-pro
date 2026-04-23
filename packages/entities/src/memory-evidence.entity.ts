import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { MemoryEntity } from './memory.entity';

export type MemoryEvidenceSourceTable =
  | 'weibo_posts'
  | 'weibo_comments'
  | 'weibo_reposts'
  | 'post_nlp_results'
  | 'user_relation_statistics'
  | 'events';

export type MemoryEvidenceType =
  | 'direct_quote'
  | 'statistical_summary'
  | 'relation_signal'
  | 'nlp_feature';

@Entity('memory_evidence')
@Index(['memory_id'])
@Index(['source_table', 'source_id'])
export class MemoryEvidenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'memory_id' })
  memory_id!: string;

  @ManyToOne(() => MemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memory_id' })
  memory!: MemoryEntity;

  @Column({ type: 'varchar', length: 64, name: 'source_table' })
  source_table!: MemoryEvidenceSourceTable;

  @Column({ type: 'varchar', length: 255, name: 'source_id' })
  source_id!: string;

  @Column({ type: 'text', nullable: true })
  excerpt!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'evidence_type' })
  evidence_type!: MemoryEvidenceType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  score!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
