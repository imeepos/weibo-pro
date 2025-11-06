import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Entity } from './decorator.js';
/**
 * 微博账号状态枚举
 * 统一管理微博账号的各种状态
 */
export enum WeiboAccountStatus {
  ACTIVE = 'ACTIVE',       // 正常可用
  INACTIVE = 'INACTIVE',   // 用户手动禁用
  SUSPENDED = 'SUSPENDED', // 平台暂停
  BANNED = 'BANNED',       // 账号被封禁
  RESTRICTED = 'RESTRICTED', // 风控受限
  EXPIRED = 'EXPIRED'      // Cookie 已过期
}

/**
 * 微博账号实体
 * 用于存储用户绑定的微博账号信息和登录凭证
 */
@Entity('weibo_accounts')
@Index(['weiboUid'], { unique: true }) // 确保微博账号唯一性
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 50, name: 'weibo_uid' })
  weiboUid!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'weibo_nickname' })
  weiboNickname!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'weibo_avatar' })
  weiboAvatar!: string;

  @Column({ type: 'text' })
  cookies!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: WeiboAccountStatus,
    default: WeiboAccountStatus.ACTIVE,
  })
  status!: WeiboAccountStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_check_at' })
  lastCheckAt!: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
