import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { WeiboPostEntity } from './weibo-post.entity';

/**
 * 微博帖子快照实体
 *
 * 存在即合理：
 * - 记录每次抓取时帖子的互动数据
 * - 用于计算增量变化（新增评论、转发、点赞）
 * - 支持检测旧帖子突然爆火的情况
 */
@Entity('weibo_post_snapshots')
@Index(['post_id', 'snapshot_at'], { unique: true })
@Index(['post_id'])
@Index(['snapshot_at'])
export class WeiboPostSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'post_id' })
  post_id!: string;

  @ManyToOne(() => WeiboPostEntity)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' })
  post!: WeiboPostEntity;

  @Column({ type: 'integer', default: 0, name: 'comments_count' })
  comments_count!: number;

  @Column({ type: 'integer', default: 0, name: 'reposts_count' })
  reposts_count!: number;

  @Column({ type: 'integer', default: 0, name: 'attitudes_count' })
  attitudes_count!: number;

  @Column({ type: 'timestamptz', name: 'snapshot_at' })
  snapshot_at!: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
