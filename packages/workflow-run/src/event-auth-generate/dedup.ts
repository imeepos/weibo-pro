import type { EventEntity } from '@sker/entities';
import type { LLMGeneratedEvent } from './types';

/**
 * 传统关键词匹配去重（兜底方案）
 */
export function findSimilarEventByKeywords(
  event: LLMGeneratedEvent,
  existingEvents: EventEntity[]
): EventEntity | null {
  const normalizedTitle = event.title.trim().toLowerCase();

  for (const existingEvent of existingEvents) {
    const existingTitle = existingEvent.title.trim().toLowerCase();

    // 1. 精确匹配（忽略大小写和前后空格）
    if (normalizedTitle === existingTitle) {
      console.log(`[EventAuthGenerateAstVisitor] 发现完全相同事件: ${existingEvent.id} - ${existingEvent.title}`);
      return existingEvent;
    }

    // 2. 相似度检查：标题包含相同的关键词
    const keywords = event.title.split(/[\s,，。]+/).filter(w => w.length > 2);
    if (keywords.length > 0) {
      let matchCount = 0;
      for (const keyword of keywords) {
        if (existingEvent.title.includes(keyword)) {
          matchCount++;
        }
      }

      // 如果有50%以上的关键词匹配，认为是相似事件
      if (matchCount >= keywords.length * 0.5) {
        console.log(`[EventAuthGenerateAstVisitor] 发现相似事件: ${existingEvent.id} - ${existingEvent.title}`);
        return existingEvent;
      }
    }
  }

  return null;
}
