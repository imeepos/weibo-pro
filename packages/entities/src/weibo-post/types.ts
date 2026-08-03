/**
 * 微博帖子 JSONB 列的共享类型定义
 *
 * 这些接口描述微博 API 返回的嵌套数据结构，
 * 被 WeiboPostEntity 中对应的 jsonb 列作为类型标注使用。
 */

export interface Visible {
  type: number;
  list_id: number;
}

export interface StatusTotalCounter {
  total_cnt_format: string;
  comment_cnt: string;
  repost_cnt: string;
  like_cnt: string;
  total_cnt: string;
}

export interface IconData {
  mbrank: number;
  mbtype: number;
  svip: number;
  vvip: number;
}

export interface _IconListItem {
  type: string;
  data: IconData;
}

export interface Annotation {
  photo_sub_type?: string;
  super_exparams?: string;
  client_mblogid?: string;
  source_text?: string;
  phone_id?: string;
  mapi_request?: boolean;
}

export interface NumberDisplayStrategy {
  apply_scenario_flag: number;
  display_text_min_number: number;
  display_text: string;
}

export interface TitleSource {
  name: string;
  url: string;
  image: string;
}

export interface CommentManageInfo {
  comment_permission_type: number;
  approval_comment_type: number;
  comment_sort_type: number;
}

export interface IconItem {
  name?: string;
  url: string;
  scheme?: string;
  length?: number;
  type?: string;
}

export interface Truncation {
  mode: number;
  keep_end_size?: number;
}

export interface Actionlog {
  act_code: number | string;
  oid?: string;
  uicode?: string | null;
  luicode?: string | null;
  fid?: string | null;
  ext?: string;
  act_type?: number;
  uuid?: number;
  cardid?: string;
  lcardid?: string;
  lfid?: string;
  mid?: string;
  source?: string;
  code?: number | string;
  mark?: string;
  uid?: string;
}

export interface ScreenNameSuffixNew {
  content: string;
  remark?: string;
  color: string;
  dark_color: string;
  type: number;
  icons?: IconItem[];
  icons_location?: number;
  truncation: Truncation;
  scheme?: string;
  actionlog?: Actionlog;
}

export interface TopicStructItem {
  title: string;
  topic_url: string;
  topic_title: string;
  actionlog: Actionlog;
}

export interface UrlStructItem {
  url_title: string;
  url_type_pic: string;
  ori_url: string;
  page_id: string;
  short_url: string;
  long_url: string;
  url_type: number | string;
  result: boolean;
  actionlog: Actionlog;
  storage_type: string;
  hide: number;
  object_type: string;
  ttl?: number;
  h5_target_url: string;
  need_save_obj: number;
}

export interface Title {
  text: string;
  base_color: number;
  icon_url: string;
}

export interface ButtonParams {
  uid: string;
  scheme: string;
  type: string;
}

export interface Button {
  name: string;
  pic: string;
  type: string;
  params: ButtonParams;
  actionlog: Actionlog;
}

export interface CommonStructItem {
  url: string;
  name: string;
  desc: string;
  img: string;
  type: number;
  btn_show_type: string;
  page_id: string;
  actionlog: Actionlog;
  buttons: Button[];
  hidden: number;
}

export interface PicInfo {
  height: number | string;
  url: string;
  width: number | string;
}

export interface PicInfoGroup {
  pic_big: PicInfo;
  pic_small: PicInfo;
  pic_middle: PicInfo;
}

export interface TranscodeInfo {
  pcdn_rule_id: number;
  pcdn_jank: number;
  origin_video_dr: string;
  ab_strategies: string;
}

export interface Extension {
  transcode_info: TranscodeInfo;
}

export interface PlayInfo {
  type: number;
  mime: string;
  protocol: string;
  label: string;
  url: string;
  bitrate?: number;
  prefetch_range?: string;
  video_codecs?: string;
  fps?: number;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  sar?: string;
  audio_codecs?: string;
  audio_sample_rate?: number;
  quality_label: string;
  quality_class: string;
  quality_desc: string;
  audio_channels?: number;
  audio_sample_fmt?: string;
  audio_bits_per_sample?: number;
  watermark?: string;
  extension: Extension;
  video_decoder: string;
  prefetch_enabled: boolean;
  tcp_receive_buffer: number;
  dolby_atmos?: boolean;
  color_transfer?: string;
  stereo_video?: number;
  first_pkt_end_pos?: number;
  col?: number;
  row?: number;
  interval?: number;
  offset?: number;
  urls?: string[];
}

export interface Meta {
  label: string;
  quality_index: number;
  quality_desc: string;
  quality_label: string;
  quality_class: string;
  type: number;
  quality_group: number;
  is_hidden: boolean;
}

export interface PlaybackListItem {
  meta: Meta;
  play_info: PlayInfo;
}

export interface AuthorInfo {
  id: number;
  idstr: string;
  pc_new: number;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
  verified: boolean;
  verified_type: number;
  domain: string;
  weihao: string;
  verified_type_ext: number;
  status_total_counter: StatusTotalCounter;
  avatar_large: string;
  avatar_hd: string;
  follow_me: boolean;
  following: boolean;
  mbrank: number;
  mbtype: number;
  v_plus: number;
  user_ability: number;
  planet_video: boolean;
  verified_reason: string;
  description: string;
  location: string;
  gender: string;
  followers_count: number;
  followers_count_str: string;
  friends_count: number;
  statuses_count: number;
  url: string;
  svip: number;
  vvip: number;
  cover_image_phone: string;
}

export interface BigPicInfo {
  pic_big: PicInfo;
  pic_small: PicInfo;
  pic_middle: PicInfo;
}

export interface VideoDownloadStrategy {
  abandon_download: number;
}

export interface ExtraInfo {
  sceneid: string;
}

export interface ExtInfo {
  video_orientation: string;
}

export interface PlayCompletionActionActionlog {
  oid: string;
  act_code: number;
  act_type: number;
  source: string;
  mid: string;
  code: string;
  mark: string;
  ext: string | null;
}

export interface PlayCompletionAction {
  type: string;
  icon: string;
  text: string;
  link: string;
  btn_code: number;
  show_position: number;
  actionlog: PlayCompletionActionActionlog;
}

export interface MediaInfo {
  name: string;
  stream_url: string;
  stream_url_hd: string;
  format: string;
  h5_url: string;
  mp4_sd_url: string;
  mp4_hd_url: string;
  h265_mp4_hd: string;
  h265_mp4_ld: string;
  inch_4_mp4_hd: string;
  inch_5_mp4_hd: string;
  inch_5_5_mp4_hd: string;
  mp4_720p_mp4: string;
  hevc_mp4_720p: string;
  prefetch_type: number;
  prefetch_size: number;
  act_status: number;
  protocol: string;
  media_id: string;
  origin_total_bitrate: number;
  video_orientation: string;
  duration: number;
  forward_strategy: number;
  search_scheme: string;
  is_short_video: number;
  vote_is_show: number;
  belong_collection: number;
  titles_display_time: string;
  show_progress_bar: number;
  show_mute_button: boolean;
  ext_info: ExtInfo;
  next_title: string;
  kol_title: string;
  play_completion_actions: PlayCompletionAction[];
  video_publish_time: number;
  play_loop_type: number;
  author_mid: string;
  author_name: string;
  extra_info: ExtraInfo;
  video_download_strategy: VideoDownloadStrategy;
  jump_to: number;
  big_pic_info: BigPicInfo;
  online_users: string;
  online_users_number: number;
  ttl: number;
  storage_type: string;
  is_keep_current_mblog: number;
  has_recommend_video: number;
  author_info: AuthorInfo;
  playback_list: PlaybackListItem[];
}

export interface PageInfo {
  type: string;
  page_id: string;
  object_type: string;
  object_id: string;
  content1: string;
  content2: string;
  act_status: number;
  media_info: MediaInfo;
  page_pic: string;
  page_title: string;
  page_url: string;
  pic_info: PicInfoGroup;
  oid: string;
  type_icon: string;
  author_id: string;
  authorid: string;
  warn: string;
  actionlog: Actionlog;
  short_url: string;
}
