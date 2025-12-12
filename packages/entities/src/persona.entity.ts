import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';

/** 物品 */
export interface PersonaInventoryItem {
  id: string;
  name: string;
  quantity: number;
  category?: 'equipment' | 'consumable' | 'material' | 'quest';
  attributes?: Record<string, unknown>;
}

/** 角色可见属性：物品、装备、货币 */
export interface PersonaMetadata {
  inventory?: PersonaInventoryItem[];
  currency?: Record<string, number>;
  equipment?: Record<string, string | null>;
  [key: string]: unknown;
}

/** 角色不可见属性：命运/宿命，由导演配置，影响剧情走向 */
export interface PersonaDestiny {
  archetype?: string;
  triggers?: Array<{
    condition: string;
    effect: string;
    activated?: boolean;
  }>;
  flags?: Record<string, boolean | string | number>;
  directives?: string[];
  [key: string]: unknown;
}

@Entity('personas')
@Index(['name'])
export class PersonaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 角色背景故事 */
  @Column({ type: 'text', nullable: true })
  background!: string | null;

  /** 性格特质 */
  @Column({ type: 'jsonb', nullable: true })
  traits!: string[] | null;

  /** 角色可见属性 */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata!: PersonaMetadata;

  /** 命运配置（角色不可见） */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  destiny!: PersonaDestiny;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
