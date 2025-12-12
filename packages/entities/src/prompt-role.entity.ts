import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Entity } from './decorator';
import { PromptRoleSkillRefEntity } from './prompt-role-skill-ref.entity';

export type PromptResourceScope = 'system' | 'user' | 'project';

@Entity('prompt_roles')
@Index(['scope'])
@Index(['project_id'])
@Index(['created_at'])
export class PromptRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  role_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  personality!: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  scope!: PromptResourceScope;

  @Column({ type: 'uuid', nullable: true, name: 'project_id' })
  project_id!: string | null;

  @OneToMany(() => PromptRoleSkillRefEntity, (ref) => ref.role)
  skill_refs!: PromptRoleSkillRefEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
