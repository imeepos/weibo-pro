import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { PromptRoleEntity } from './prompt-role.entity';
import { PromptSkillEntity, type PromptSkillType } from './prompt-skill.entity';

export type PromptRefType = 'required' | 'optional';

@Entity('prompt_role_skill_refs')
@Index(['role_id', 'skill_id'], { unique: true })
@Index(['role_id'])
@Index(['skill_id'])
@Index(['role_id', 'skill_type'])
export class PromptRoleSkillRefEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'role_id' })
  role_id!: string;

  @ManyToOne(() => PromptRoleEntity)
  @JoinColumn({ name: 'role_id' })
  role!: PromptRoleEntity;

  @Column({ type: 'uuid', name: 'skill_id' })
  skill_id!: string;

  @ManyToOne(() => PromptSkillEntity)
  @JoinColumn({ name: 'skill_id' })
  skill!: PromptSkillEntity;

  /** 冗余字段，便于按类型查询 */
  @Column({ type: 'varchar', length: 20, name: 'skill_type' })
  skill_type!: PromptSkillType;

  @Column({ type: 'varchar', length: 20, default: 'required', name: 'ref_type' })
  ref_type!: PromptRefType;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sort_order!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
