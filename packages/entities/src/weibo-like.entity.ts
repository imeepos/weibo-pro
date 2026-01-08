import {
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { WeiboUserEntity } from './weibo-user.entity';

@Entity('weibo_likes')
@Index(['targetWeiboId', 'userWeiboId'], { unique: true })
@Index(['targetWeiboId', 'createdAt'])
@Index(['userWeiboId', 'createdAt'])
export class WeiboLikeEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'bigint',
    name: 'user_weibo_id',
    comment: '点赞人微博用户ID',
  })
  userWeiboId!: string;

  @Column({
    type: 'bigint',
    name: 'target_weibo_id',
    comment: '被点赞的微博帖子ID',
  })
  targetWeiboId!: string;

  @Column({
    type: 'bigint',
    name: 'target_user_weibo_id',
    comment: '被点赞人（帖子作者）的微博用户ID',
  })
  targetUserWeiboId!: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '数据入库时间',
  })
  createdAt!: Date;

  @ManyToOne(() => WeiboUserEntity, { lazy: true })
  @JoinColumn({ name: 'user_weibo_id', referencedColumnName: 'id' })
  user!: Promise<WeiboUserEntity>;

  @ManyToOne(() => WeiboUserEntity, { lazy: true })
  @JoinColumn({ name: 'target_user_weibo_id', referencedColumnName: 'id' })
  targetUser!: Promise<WeiboUserEntity>;
}
