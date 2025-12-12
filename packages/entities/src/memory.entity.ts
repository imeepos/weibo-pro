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
import { PersonaEntity } from './persona.entity';

export type MemoryType = 'fact' | 'concept' | 'event' | 'person' | 'insight';

@Entity('memories')
@Index(['persona_id'])
@Index(['type'])
@Index(['persona_id', 'type'])
export class MemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'persona_id' })
  persona_id!: string;

  @ManyToOne(() => PersonaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id' })
  persona!: PersonaEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: MemoryType;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
