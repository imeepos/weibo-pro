import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';

export type CategoryDimension =
  | 'verification'
  | 'influence'
  | 'capability'
  | 'industry';

@Entity('weibo_user_categories')
@Index(['code'], { unique: true })
@Index(['dimension'])
@Index(['status'])
export class WeiboUserCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'name_en' })
  name_en!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '分类维度：verification认证类型, influence影响力, capability账户能力, industry行业领域'
  })
  dimension!: CategoryDimension;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @Column({ type: 'integer', default: 0 })
  sort!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
  })
  status!: 'active' | 'inactive';

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
