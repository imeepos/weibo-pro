import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { WeiboUserEntity } from './weibo-user.entity';
import { WeiboUserCategoryEntity } from './weibo-user-category.entity';

@Entity('weibo_user_category_relations')
@Index(['user_id', 'category_id'], { unique: true })
@Index(['user_id'])
@Index(['category_id'])
@Index(['confidence_score'])
export class WeiboUserCategoryRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'user_id' })
  user_id!: number;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity;

  @Column({ type: 'uuid', name: 'category_id' })
  category_id!: string;

  @ManyToOne(() => WeiboUserCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: WeiboUserCategoryEntity;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    name: 'confidence_score',
    comment: '分类置信度得分，1.0表示确定，0-1表示推测'
  })
  confidence_score!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'auto',
    comment: '分类来源：manual手动, auto自动推断, nlp自然语言分析, imported导入'
  })
  source!: 'manual' | 'auto' | 'nlp' | 'imported';

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
