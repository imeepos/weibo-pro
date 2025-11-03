import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Entity } from './decorator.js';
/**
 * 微博账号实体
 * 用于存储用户绑定的微博账号信息和登录凭证
 */
@Entity('weibo_accounts')
@Index(['userId', 'weiboUid'], { unique: true }) // 同一用户不能重复绑定同一微博账号
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 50, name: 'weibo_uid' })
  uid!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'weibo_nickname' })
  nickname!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'weibo_avatar' })
  avatar!: string;

  @Column({ type: 'text' })
  cookies!: string;

  @Index()
  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_check_at' })
  lastCheckAt!: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
