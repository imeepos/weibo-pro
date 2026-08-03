import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator';
import { EventEntity } from './event.entity';
import { WeiboUserEntity } from './weibo-user.entity';
import type {
  Annotation,
  CommentManageInfo,
  CommonStructItem,
  NumberDisplayStrategy,
  PageInfo,
  ScreenNameSuffixNew,
  Title,
  TitleSource,
  TopicStructItem,
  UrlStructItem,
  Visible,
} from './weibo-post/types';

export { PostProcessFlags } from './weibo-post/post-process-flags';

@Entity('weibo_posts')
@Index(['id'], { unique: true })
@Index(['mid'], { unique: true })
@Index(['event_id'])
@Index(['user_id'])
export class WeiboPostEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'uuid', name: 'event_id', nullable: true })
  event_id!: string | null;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity | null;

  @OneToMany('PostNLPResultEntity', 'post')
  nlpResult!: unknown[];

  @Column({ type: 'jsonb', name: 'visible', nullable: true })
  visible!: Visible;

  @Column({ type: 'timestamptz', nullable: true, name: 'created_at', comment: '微博发布时间' })
  created_at!: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'idstr', nullable: true })
  idstr!: string;

  @Column({ type: 'varchar', length: 64, name: 'mid', nullable: true })
  mid!: string;

  @Column({ type: 'varchar', length: 64, name: 'mblogid', nullable: true })
  mblogid!: string;

  @Column({ type: 'bigint', name: 'user_id', nullable: true, comment: '发帖用户 ID' })
  user_id!: number | null;

  @ManyToOne(() => WeiboUserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  @Column({ type: 'boolean', name: 'can_edit', nullable: true })
  can_edit!: boolean;

  @Column({ type: 'integer', name: 'textLength', default: 0 })
  textLength!: number;

  @Column({ type: 'jsonb', name: 'annotations', nullable: true })
  annotations!: Annotation[];

  @Column({ type: 'text', name: 'source', default: '' })
  source!: string;

  @Column({ type: 'boolean', name: 'favorited', default: false })
  favorited!: boolean;

  @Column({ type: 'varchar', length: 255, name: 'mark', nullable: true })
  mark!: string;

  @Column({ type: 'varchar', length: 255, name: 'rid', nullable: true })
  rid!: string;

  @Column({ type: 'varchar', length: 255, name: 'cardid', default: '' })
  cardid!: string;

  @Column({ type: 'jsonb', name: 'pic_ids', nullable: true })
  pic_ids!: string[];

  @Column({ type: 'integer', name: 'pic_num', nullable: true })
  pic_num!: number;

  @Column({ type: 'boolean', name: 'is_paid', nullable: true })
  is_paid!: boolean;

  @Column({ type: 'text', name: 'pic_bg_new', nullable: true })
  pic_bg_new!: string | null;

  @Column({ type: 'integer', name: 'mblog_vip_type', nullable: true })
  mblog_vip_type!: number;

  @Column({ type: 'jsonb', name: 'number_display_strategy', nullable: true })
  number_display_strategy!: NumberDisplayStrategy;

  @Column({ type: 'jsonb', name: 'title_source', nullable: true })
  title_source!: TitleSource | null;

  @Column({ type: 'integer', name: 'reposts_count', nullable: true })
  reposts_count!: number;

  @Column({ type: 'integer', name: 'comments_count', nullable: true })
  comments_count!: number;

  @Column({ type: 'integer', name: 'attitudes_count', nullable: true })
  attitudes_count!: number;

  @Column({ type: 'integer', name: 'attitudes_status', nullable: true })
  attitudes_status!: number;

  @Column({ type: 'boolean', name: 'isLongText', nullable: true })
  isLongText!: boolean;

  @Column({ type: 'integer', name: 'mlevel', nullable: true })
  mlevel!: number;

  @Column({ type: 'integer', name: 'content_auth', nullable: true })
  content_auth!: number;

  @Column({ type: 'integer', name: 'is_show_bulletin', nullable: true })
  is_show_bulletin!: number;

  @Column({ type: 'jsonb', name: 'comment_manage_info', nullable: true })
  comment_manage_info!: CommentManageInfo;

  @Column({ type: 'jsonb', name: 'screen_name_suffix_new', nullable: true })
  screen_name_suffix_new: ScreenNameSuffixNew[] = [];

  @Column({ type: 'integer', name: 'share_repost_type', default: 0 })
  share_repost_type!: number;

  @Column({ type: 'jsonb', name: 'topic_struct', nullable: true })
  topic_struct!: TopicStructItem[];

  @Column({ type: 'jsonb', name: 'url_struct', nullable: true })
  url_struct!: UrlStructItem[];

  @Column({ type: 'jsonb', name: 'title', nullable: true })
  title!: Title | null;

  @Column({ type: 'integer', name: 'mblogtype', default: 0 })
  mblogtype!: number;

  @Column({ type: 'boolean', name: 'showFeedRepost', default: false })
  showFeedRepost!: boolean;

  @Column({ type: 'boolean', name: 'showFeedComment', default: false })
  showFeedComment!: boolean;

  @Column({ type: 'boolean', name: 'pictureViewerSign', default: false })
  pictureViewerSign!: boolean;

  @Column({ type: 'boolean', name: 'showPictureViewer', default: false })
  showPictureViewer!: boolean;

  @Column({ type: 'jsonb', name: 'rcList', nullable: true })
  rcList!: unknown[];

  @Column({ type: 'jsonb', name: 'common_struct', nullable: true })
  common_struct!: CommonStructItem[];

  @Column({ type: 'text', name: 'analysis_extra', default: `` })
  analysis_extra!: string;

  @Column({ type: 'varchar', length: 255, name: 'readtimetype', default: `` })
  readtimetype!: string;

  @Column({ type: 'integer', name: 'mixed_count', default: 0 })
  mixed_count!: number;

  @Column({ type: 'boolean', name: 'is_show_mixed', default: false })
  is_show_mixed!: boolean;

  @Column({ type: 'jsonb', name: 'mblog_feed_back_menus_format', nullable: true })
  mblog_feed_back_menus_format!: unknown[];

  @Column({ type: 'boolean', name: 'isAd', default: false })
  isAd!: boolean;

  @Column({ type: 'boolean', name: 'isSinglePayAudio', default: false })
  isSinglePayAudio!: boolean;

  @Column({ type: 'text', name: 'text', default: `` })
  text!: string;

  @Column({ type: 'text', name: 'text_raw', default: `` })
  text_raw!: string;

  @Column({ type: 'varchar', length: 255, name: 'region_name', nullable: true })
  region_name!: string | null;

  @Column({ type: 'jsonb', name: 'page_info', nullable: true })
  page_info!: PageInfo | null;

  @Column({ type: 'integer', name: 'ok', default: 1 })
  ok!: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '数据入库时间',
  })
  ingested_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '记录更新时间',
  })
  updated_at!: Date;

  /**
   * 处理状态位标志 (6 位二进制)
   * 使用 PostProcessFlags 常量进行位运算
   */
  @Column({ type: 'smallint', name: 'process_flags', default: 0 })
  @Index()
  process_flags!: number;

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
    comment: '软删除时间',
  })
  deleted_at!: Date | null;

  /** 检查是否设置了指定标志 */
  hasFlag(flag: number): boolean {
    return (this.process_flags & flag) !== 0;
  }

  /** 设置标志（返回新值，不修改实体） */
  static setFlag(current: number, flag: number): number {
    return current | flag;
  }

  /** 清除标志（返回新值，不修改实体） */
  static clearFlag(current: number, flag: number): number {
    return current & ~flag;
  }
}
