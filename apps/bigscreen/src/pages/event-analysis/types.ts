import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { EventItem } from '@/types';

/** 从趋势数据中提取的各系列数据 */
export interface TrendSeries {
  events: number[];
  posts: number[];
  users: number[];
  hotness: number[];
}

/** 统计概览卡片数据 */
export interface EventStats {
  totalEvents: number;
  totalPosts: number;
  totalUsers: number;
  avgHotness: number;
  eventChange: number;
  postChange: number;
  userChange: number;
  hotnessChange: number;
}

/** 情感标签配置 */
export interface SentimentConfig {
  color: string;
  label: string;
  icon: LucideIcon;
}

/** 趋势标签配置 */
export interface TrendConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

/** 编辑事件弹窗的对外 API（由 useEditEventDialog 提供） */
export interface EditEventDialogApi {
  editingEventId: string | null;
  editingKeywords: string[];
  keywordInput: string;
  editingOccurredAt: Date | null;
  isSaving: boolean;
  openEditDialog: (event: EventItem, e: MouseEvent) => void;
  closeEditDialog: () => void;
  setEditingKeywords: Dispatch<SetStateAction<string[]>>;
  setKeywordInput: (value: string) => void;
  setEditingOccurredAt: (date: Date | null) => void;
  saveChanges: () => Promise<void>;
}
