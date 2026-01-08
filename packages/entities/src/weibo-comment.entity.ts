import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { WeiboUserEntity } from './weibo-user.entity';

/**
 * 微博评论实体
 *
 * 评论层级判断：
 * - 一级评论：id === rootid，floor_number > 0，reply_comment = null
 * - 子评论：id !== rootid，floor_number = 0，reply_comment 包含被回复评论
 *
 * 用户评论关系：user_id → reply_to_user_id
 * - 一级评论：评论者 → 帖子作者（reply_to_user_id = post_author_id）
 * - 子评论：评论者 → 被回复用户（reply_to_user_id 从 reply_comment.user.id 解析）
 */
@Entity('weibo_comments')
@Index(['id'], { unique: true })
@Index(['mid'], { unique: true })
@Index(['user_id'])
@Index(['post_author_id'])
@Index(['reply_to_user_id'])
@Index(['user_id', 'reply_to_user_id'])
export class WeiboCommentEntity {

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '微博评论时间（来源数据，字符串格式）' })
  created_at!: string;

  /** 评论唯一 ID */
  @PrimaryColumn({ type: 'bigint' })
  id!: number;

  /** 根评论 ID，一级评论时 rootid === id，子评论时指向所属的一级评论 */
  @Column({ type: 'bigint', nullable: true })
  rootid!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rootidstr!: string;

  /** 楼层号，一级评论为正整数，子评论为 0 */
  @Column({ type: 'integer', nullable: true })
  floor_number!: number;

  @Column({ type: 'text', nullable: true })
  text!: string;

  @Column({ type: 'integer', nullable: true })
  disable_reply!: number;

  @Column({ type: 'integer', nullable: true })
  restrictOperate!: number;

  @Column({ type: 'integer', nullable: true })
  source_allowclick!: number;

  @Column({ type: 'integer', nullable: true })
  source_type!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source!: string;

  @Column({ type: 'bigint', name: 'user_id', nullable: true, comment: '评论用户 ID' })
  user_id!: number | null;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  /** 帖子作者 ID，从 analysis_extra 中解析 */
  @Column({ type: 'bigint', name: 'post_author_id', nullable: true })
  post_author_id!: number | null;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'post_author_id' })
  postAuthor!: WeiboUserEntity | null;

  /**
   * 被回复用户 ID
   * - 一级评论：等于 post_author_id（评论帖子作者）
   * - 子评论：从 reply_comment.user.id 解析（回复某用户的评论）
   */
  @Column({ type: 'bigint', name: 'reply_to_user_id', nullable: true })
  reply_to_user_id!: number | null;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'reply_to_user_id' })
  replyToUser!: WeiboUserEntity | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mid!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  idstr!: string;

  @Column({ type: 'boolean', nullable: true })
  liked!: boolean;

  @Column({ type: 'integer', nullable: true })
  pic_num!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  readtimetype!: string;

  @Column({ type: 'text', nullable: true })
  analysis_extra!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cmt_ext!: string;

  @Column({ type: 'boolean', nullable: true })
  match_ai_play_picture!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  rid!: string;

  @Column({ type: 'boolean', nullable: true })
  allow_follow!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  item_category!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  degrade_type!: string;

  @Column({ type: 'text', nullable: true })
  report_scheme!: string;

  @Column({ type: 'integer', nullable: true })
  from_repost_type!: number;

  @Column({ type: 'jsonb', nullable: true })
  comments!: unknown[];

  @Column({ type: 'bigint', nullable: true })
  max_id!: number;

  @Column({ type: 'integer', nullable: true })
  total_number!: number;

  @Column({ type: 'boolean', nullable: true })
  isLikedByMblogAuthor!: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  status_exempt_url_block!: string;

  @Column({ type: 'jsonb', nullable: true })
  url_struct!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  topic_struct!: unknown[];

  /** 被回复的评论，一级评论为 null，子评论包含被回复评论的完整信息 */
  @Column({ type: 'jsonb', nullable: true })
  reply_comment!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  comment_bubble!: Record<string, unknown>;

  @Column({ type: 'integer', nullable: true })
  like_counts!: number;

  @Column({ type: 'jsonb', nullable: true })
  more_info!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  text_raw!: string;

  @Column({ type: 'boolean', nullable: true })
  isExpand!: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '数据入库时间',
  })
  ingestedAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '记录更新时间',
  })
  updatedAt!: Date;
}
