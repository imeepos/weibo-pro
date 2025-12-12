import { Column, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Entity } from './decorator';
import { MemoryEntity } from './memory.entity';

@Entity('memory_closures')
@Index(['ancestor_id'])
@Index(['descendant_id'])
@Index(['depth'])
export class MemoryClosureEntity {
  @PrimaryColumn({ type: 'uuid', name: 'ancestor_id' })
  ancestor_id!: string;

  @ManyToOne(() => MemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ancestor_id' })
  ancestor!: MemoryEntity;

  @PrimaryColumn({ type: 'uuid', name: 'descendant_id' })
  descendant_id!: string;

  @ManyToOne(() => MemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descendant_id' })
  descendant!: MemoryEntity;

  @PrimaryColumn({ type: 'uuid', array: true })
  path!: string[];

  @Column({ type: 'smallint' })
  depth!: number;
}
