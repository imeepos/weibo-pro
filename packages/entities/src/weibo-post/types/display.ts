/**
 * 微博帖子 JSONB 展示结构类型
 *
 * 描述卡片 / 富文本 / 按钮等展示层结构，依赖 basic 类型。
 */

import type {
  Actionlog,
  IconItem,
  Truncation,
} from './basic';

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
