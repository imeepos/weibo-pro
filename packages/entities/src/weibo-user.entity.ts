import { Column, Index, PrimaryColumn, OneToMany } from 'typeorm';
import { Entity } from './decorator';
import { booleanToSmallintTransformer } from './transformers/boolean-to-smallint.transformer';
import { WeiboUserCategoryRelationEntity } from './weibo-user-category-relation.entity';

/**
 * 常用列选项工厂
 * 每次调用返回新对象，避免多个列共享同一引用。
 */
const varchar = (length: number) => ({ type: 'varchar' as const, length, nullable: true });
const text = () => ({ type: 'text' as const, nullable: true });
const jsonb = () => ({ type: 'jsonb' as const, nullable: true });
const bool = (def: boolean) => ({ type: 'boolean' as const, default: def, nullable: true });
const int = (def: number) => ({ type: 'integer' as const, default: def, nullable: true });
const bigint = (def: number) => ({ type: 'bigint' as const, default: def, nullable: true });
const smallintBool = (def: number) => ({ type: 'smallint' as const, default: def, nullable: true, transformer: booleanToSmallintTransformer });

@Entity('weibo_users')
@Index(['id'], { unique: true })
export class WeiboUserEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number;

  @Column(varchar(32)) idstr!: string | null;
  @Column(smallintBool(1)) class!: number | null;
  @Column(varchar(64)) screen_name!: string | null;
  @Column(varchar(64)) name!: string | null;
  @Column(varchar(16)) province!: string | null;
  @Column(varchar(16)) city!: string | null;
  @Column(varchar(128)) location!: string | null;
  @Column(text()) description!: string | null;
  @Column(text()) url!: string | null;
  @Column(text()) profile_image_url!: string | null;
  @Column(bool(false)) light_ring!: boolean | null;
  @Column(text()) cover_image_phone!: string | null;
  @Column(text()) profile_url!: string | null;
  @Column(varchar(64)) domain!: string | null;
  @Column(varchar(64)) weihao!: string | null;
  @Column({ type: 'char', length: 1, default: 'n', nullable: true }) gender!: string | null;
  @Column(int(0)) followers_count!: number | null;
  @Column({ type: 'varchar', length: 32, default: '0', nullable: true }) followers_count_str!: string | null;
  @Column(int(0)) friends_count!: number | null;
  @Column(int(0)) pagefriends_count!: number | null;
  @Column(int(0)) statuses_count!: number | null;
  @Column(int(0)) video_status_count!: number | null;
  @Column(int(0)) video_play_count!: number | null;
  @Column(int(0)) v_plus!: number | null;
  @Column(int(0)) super_topic_not_syn_count!: number | null;
  @Column(int(0)) favourites_count!: number | null;
  @Column(varchar(64)) created_at!: string | null;
  @Column(bool(false)) following!: boolean | null;
  @Column(bool(false)) allow_all_act_msg!: boolean | null;
  @Column(bool(false)) geo_enabled!: boolean | null;
  @Column(bool(false)) verified!: boolean | null;
  @Column(smallintBool(-1)) verified_type!: number | null;
  @Column(varchar(255)) remark!: string | null;
  @Column(jsonb()) insecurity!: Record<string, unknown> | null;
  @Column(smallintBool(0)) ptype!: number | null;
  @Column(bool(true)) allow_all_comment!: boolean | null;
  @Column(text()) avatar_large!: string | null;
  @Column(text()) avatar_hd!: string | null;
  @Column(text()) verified_reason!: string | null;
  @Column(varchar(128)) verified_trade!: string | null;
  @Column(text()) verified_reason_url!: string | null;
  @Column(text()) verified_source!: string | null;
  @Column(text()) verified_source_url!: string | null;
  @Column(bool(false)) follow_me!: boolean | null;
  @Column(bool(false)) like!: boolean | null;
  @Column(bool(false)) like_me!: boolean | null;
  @Column(smallintBool(0)) online_status!: number | null;
  @Column(int(0)) bi_followers_count!: number | null;
  @Column({ type: 'varchar', length: 16, default: 'zh-cn', nullable: true }) lang!: string | null;
  @Column(smallintBool(0)) star!: number | null;
  @Column(smallintBool(0)) mbtype!: number | null;
  @Column(smallintBool(0)) mbrank!: number | null;
  @Column(smallintBool(0)) svip!: number | null;
  @Column(smallintBool(0)) vvip!: number | null;
  @Column(bigint(0)) mb_expire_time!: number | null;
  @Column(smallintBool(0)) block_word!: number | null;
  @Column(smallintBool(0)) block_app!: number | null;
  @Column(int(0)) chaohua_ability!: number | null;
  @Column(int(0)) brand_ability!: number | null;
  @Column(int(0)) nft_ability!: number | null;
  @Column(int(0)) vplus_ability!: number | null;
  @Column(int(0)) wenda_ability!: number | null;
  @Column(int(0)) live_ability!: number | null;
  @Column(int(0)) gongyi_ability!: number | null;
  @Column(int(0)) paycolumn_ability!: number | null;
  @Column(int(0)) newbrand_ability!: number | null;
  @Column(int(0)) ecommerce_ability!: number | null;
  @Column(int(0)) hardfan_ability!: number | null;
  @Column(int(0)) wbcolumn_ability!: number | null;
  @Column(int(0)) interaction_user!: number | null;
  @Column(int(0)) audio_ability!: number | null;
  @Column(int(0)) place_ability!: number | null;
  @Column(int(0)) credit_score!: number | null;
  @Column(bigint(0)) user_ability!: number | null;
  @Column(smallintBool(0)) urank!: number | null;
  @Column(smallintBool(-1)) story_read_state!: number | null;
  @Column(smallintBool(0)) vclub_member!: number | null;
  @Column(smallintBool(0)) is_teenager!: number | null;
  @Column(smallintBool(0)) is_guardian!: number | null;
  @Column(smallintBool(0)) is_teenager_list!: number | null;
  @Column(smallintBool(0)) pc_new!: number | null;
  @Column(bool(false)) special_follow!: boolean | null;
  @Column(smallintBool(0)) planet_video!: number | null;
  @Column(smallintBool(0)) video_mark!: number | null;
  @Column(smallintBool(0)) live_status!: number | null;
  @Column(bigint(0)) user_ability_extend!: number | null;
  @Column(jsonb()) status_total_counter!: Record<string, unknown> | null;
  @Column(jsonb()) video_total_counter!: Record<string, unknown> | null;
  @Column(smallintBool(0)) brand_account!: number | null;
  @Column(smallintBool(0)) hongbaofei!: number | null;
  @Column(smallintBool(0)) reward_status!: number | null;
  @Column(smallintBool(0)) green_mode!: number | null;
  @Column(smallintBool(0)) green_mode_source!: number | null;
  @Column(bigint(0)) urisk!: number | null;
  @Column(smallintBool(0)) unfollowing_recom_switch!: number | null;
  @Column(smallintBool(1)) avatar_type!: number | null;
  @Column(smallintBool(0)) is_big!: number | null;
  @Column(smallintBool(0)) auth_status!: number | null;
  @Column(varchar(128)) auth_realname!: string | null;
  @Column(varchar(128)) auth_career!: string | null;
  @Column(varchar(128)) auth_career_name!: string | null;
  @Column(smallintBool(0)) show_auth!: number | null;
  @Column(smallintBool(0)) is_auth!: number | null;
  @Column(smallintBool(0)) is_punish!: number | null;
  @Column(varchar(128)) avatar_hd_pid!: string | null;
  @Column(smallintBool(0)) like_display!: number | null;
  @Column(smallintBool(0)) comment_display!: number | null;
  @Column(jsonb()) icons!: Array<Record<string, unknown>> | null;
  @Column(jsonb()) detail!: Array<Record<string, unknown>> | null;

  @OneToMany(
    () => WeiboUserCategoryRelationEntity,
    relation => relation.user
  )
  categories!: WeiboUserCategoryRelationEntity[];
}
