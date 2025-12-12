import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { MemoryEntity } from './memory.entity';

export type RelationType = 'related' | 'causes' | 'follows' | 'contains';

@Entity('memory_relations')
@Index(['source_id', 'target_id', 'relation_type'], { unique: true })
@Index(['source_id'])
@Index(['target_id'])
export class MemoryRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'source_id' })
  source_id!: string;

  @ManyToOne(() => MemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source!: MemoryEntity;

  @Column({ type: 'uuid', name: 'target_id' })
  target_id!: string;

  @ManyToOne(() => MemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  target!: MemoryEntity;

  @Column({ type: 'varchar', length: 50, name: 'relation_type' })
  relation_type!: RelationType;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
