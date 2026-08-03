import type { SentimentScore } from '@sker/entities';

/**
 * LLM 生成的事件数据结构
 */
export interface LLMGeneratedEvent {
  title: string;
  description?: string;
  category_id: string;
  category_name?: string; // LLM 提供的分类中文名称
  sentiment?: SentimentScore;
  hotness?: number;
  status?: 'active' | 'inactive' | 'archived';
  seed_url?: string;
  occurred_at?: string;
  peak_at?: string;
  keywords?: string[];
  reasoning?: string;
  alreadyExists?: boolean;
  existingEventId?: string;
}
