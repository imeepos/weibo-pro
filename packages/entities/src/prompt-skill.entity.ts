import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { type PromptResourceScope } from './prompt-role.entity';

export type PromptSkillType = 'thought' | 'execution' | 'knowledge' | 'decision';

export type SkillContent = string;

@Entity('prompt_skills')
@Index(['name'])
@Index(['type'])
@Index(['scope'])
@Index(['type', 'scope'])
export class PromptSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /** 技能简述，供大模型选择时参考 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: PromptSkillType;

  @Column({ type: 'text' })
  content!: SkillContent;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  scope!: PromptResourceScope;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}

/** 技能摘要，供大模型选择 */
export interface SkillSummary {
  id: string;
  title: string;
  type: PromptSkillType;
  description: string | null;
}
