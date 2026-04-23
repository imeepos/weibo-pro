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
import { WeiboUserEntity } from './weibo-user.entity';
import { PersonaEntity } from './persona.entity';

@Entity('weibo_user_persona_links')
@Index(['weibo_user_id', 'persona_id'], { unique: true })
@Index(['weibo_user_id'])
@Index(['persona_id'])
export class WeiboUserPersonaLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'weibo_user_id' })
  weibo_user_id!: string;

  @ManyToOne(() => WeiboUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weibo_user_id', referencedColumnName: 'id' })
  weiboUser!: WeiboUserEntity;

  @Column({ type: 'uuid', name: 'persona_id' })
  persona_id!: string;

  @ManyToOne(() => PersonaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id' })
  persona!: PersonaEntity;

  @Column({ type: 'boolean', name: 'is_primary', default: true })
  is_primary!: boolean;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'active' | 'archived';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  confidence!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
