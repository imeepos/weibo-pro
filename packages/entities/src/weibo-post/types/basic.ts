/**
 * 微博帖子 JSONB 基础类型
 *
 * 无依赖的叶子类型，被 display / media 等子域复用。
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
