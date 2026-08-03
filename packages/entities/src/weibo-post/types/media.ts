/**
 * 微博帖子 JSONB 媒体 / 视频类型
 *
 * 描述视频播放、作者信息、页面媒体等结构，依赖 basic 与 display 类型。
 */

import type {
  Actionlog,
  StatusTotalCounter,
} from './basic';
import type {
  PicInfo,
  PicInfoGroup,
} from './display';

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
