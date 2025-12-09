import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

@Entity({
  name: 'llm_providers'
})
@Index(['score'])
export class LlmProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 500 })
  base_url!: string;

  @Column({ type: 'varchar', length: 500 })
  api_key!: string;

  // 健康分数 (0-10000)，每次使用后降低，不自动恢复
  @Column({ type: 'int', default: 10000 })
  score!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}