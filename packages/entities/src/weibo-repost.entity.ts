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

@Entity('weibo_reposts')
@Index(['id'], { unique: true })
@Index(['mid'], { unique: true })
@Index(['mblogid'], { unique: true })
@Index(['created_at'])
@Index(['user_id'])
@Index(['post_id'])
export class WeiboRepostEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  idstr!: string;

  @Column({ type: 'varchar', length: 64 })
  mid!: string;

  @Column({ type: 'varchar', length: 64 })
  mblogid!: string;

  @Column({ type: 'bigint', name: 'user_id', nullable: true, comment: '转发用户 ID' })
  user_id!: number | null;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  /** 被转发的帖子 ID */
  @Column({ type: 'varchar', length: 64, name: 'post_id', nullable: true, comment: '被转发的帖子 ID' })
  post_id!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  visible!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  can_edit!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  annotations!: Array<Record<string, unknown>> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source!: string | null;

  @Column({ type: 'boolean', default: false })
  favorited!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  mark!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cardid!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  pic_ids!: string[] | null;

  @Column({ type: 'integer', default: 0 })
  pic_num!: number;

  @Column({ type: 'boolean', default: false })
  is_paid!: boolean;

  @Column({ type: 'text', nullable: true })
  pic_bg_new!: string | null;

  @Column({ type: 'integer', default: 0 })
  mblog_vip_type!: number;

  @Column({ type: 'jsonb', nullable: true })
  number_display_strategy!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  title_source!: Record<string, unknown> | null;

  @Column({ type: 'integer', default: 0 })
  reposts_count!: number;

  @Column({ type: 'integer', default: 0 })
  comments_count!: number;

  @Column({ type: 'integer', default: 0 })
  attitudes_count!: number;

  @Column({ type: 'integer', default: 0 })
  attitudes_status!: number;

  @Column({ type: 'boolean', default: false })
  isLongText!: boolean;

  @Column({ type: 'integer', default: 0 })
  mlevel!: number;

  @Column({ type: 'integer', default: 0 })
  content_auth!: number;

  @Column({ type: 'integer', default: 0 })
  is_show_bulletin!: number;

  @Column({ type: 'jsonb', nullable: true })
  comment_manage_info!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  screen_name_suffix_new!: Array<Record<string, unknown>> | null;

  @Column({ type: 'integer', default: 0 })
  repost_type!: number;

  @Column({ type: 'integer', default: 0 })
  share_repost_type!: number;

  @Column({ type: 'jsonb', nullable: true })
  topic_struct!: Array<Record<string, unknown>> | null;

  @Column({ type: 'jsonb', nullable: true })
  url_struct!: Array<Record<string, unknown>> | null;

  @Column({ type: 'integer', default: 0 })
  mblogtype!: number;

  @Column({ type: 'boolean', default: false })
  showFeedRepost!: boolean;

  @Column({ type: 'boolean', default: false })
  showFeedComment!: boolean;

  @Column({ type: 'boolean', default: false })
  pictureViewerSign!: boolean;

  @Column({ type: 'boolean', default: false })
  showPictureViewer!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rcList!: Array<Record<string, unknown>> | null;

  @Column({ type: 'text', nullable: true })
  analysis_extra!: string | null;

  @Column({ type: 'integer', default: 0 })
  mixed_count!: number;

  @Column({ type: 'boolean', default: false })
  is_show_mixed!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  mblog_feed_back_menus_format!: Array<Record<string, unknown>> | null;

  @Column({ type: 'boolean', default: false })
  isAd!: boolean;

  @Column({ type: 'boolean', default: false })
  isSinglePayAudio!: boolean;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', nullable: true })
  text_raw!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  region_name!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  retweeted_status!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  page_info!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', comment: '微博转发时间（来源数据）' })
  created_at!: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '数据入库时间',
  })
  ingested_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '记录更新时间',
  })
  updated_at!: Date;
}
