import type { EventCategoryEntity } from '@sker/entities';
import type { LLMGeneratedEvent } from './types';
import { resolveOrCreateCategory } from './event-category';

/**
 * 验证生成的事件数据
 */
export async function validateGeneratedEvent(
  event: LLMGeneratedEvent,
  availableCategories: EventCategoryEntity[]
): Promise<void> {
  // 验证必填字段
  if (!event.title || typeof event.title !== 'string') {
    throw new Error('事件标题缺失或无效');
  }

  if (event.title.length > 255) {
    throw new Error('事件标题超过255字符限制');
  }

  if (!event.category_id || typeof event.category_id !== 'string') {
    throw new Error('category_id 缺失或无效');
  }

  // 验证并解析 category_id
  const resolvedCategoryId = await resolveOrCreateCategory(
    event.category_id,
    availableCategories,
    event.category_name
  );
  event.category_id = resolvedCategoryId;

  // 验证 sentiment
  if (event.sentiment) {
    const { positive = 0, negative = 0, neutral = 0 } = event.sentiment;
    const sum = positive + negative + neutral;
    if (Math.abs(sum - 1.0) > 0.1) {
      console.warn('[EventAuthGenerateAstVisitor] sentiment 概率总和不为1.0，将自动归一化');
    }
  }

  // 验证日期格式
  if (event.occurred_at && isNaN(Date.parse(event.occurred_at))) {
    throw new Error('occurred_at 日期格式无效');
  }

  if (event.peak_at && isNaN(Date.parse(event.peak_at))) {
    throw new Error('peak_at 日期格式无效');
  }
}
