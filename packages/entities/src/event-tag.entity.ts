import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

@Entity('event_tags')
@Index(['name'], { unique: true })
@Index(['type'])
export class EventTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'keyword',
  })
  type!: 'keyword' | 'topic' | 'entity' | 'custom';

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'integer', default: 0, name: 'usage_count' })
  usage_count!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

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
}
