import { useEntityManager, EventEntity, type SentimentScore } from '@sker/entities';
import type { LLMGeneratedEvent } from './types';
import { parseBeijingTime, shouldUpdateDescription, shouldUpdateKeywords } from './utils';

/**
 * 获取最近的事件列表
 */
export async function fetchRecentEvents(): Promise<EventEntity[]> {
  return await useEntityManager(async (manager) => {
    return await manager.find(EventEntity, {
      where: { status: 'active' },
      order: { created_at: 'DESC' },
      take: 30, // 取最近 30 个事件
      select: {
        id: true,
        title: true,
        description: true,
        created_at: true
      }
    });
  });
}

/**
 * 通过 ID 查找事件
 */
export async function findEventById(eventId: string): Promise<EventEntity | null> {
  return await useEntityManager(async (manager) => {
    return await manager.findOne(EventEntity, { where: { id: eventId } });
  });
}

/**
 * 插入事件到数据库
 */
export async function insertEventToDatabase(generatedEvent: LLMGeneratedEvent): Promise<EventEntity> {
  return await useEntityManager(async (manager) => {
    // 归一化 sentiment
    let sentiment: SentimentScore;
    if (generatedEvent.sentiment) {
      const { positive = 0, negative = 0, neutral = 0 } = generatedEvent.sentiment;
      const sum = positive + negative + neutral || 1;
      sentiment = {
        positive: sum > 0 ? positive / sum : 0.33,
        negative: sum > 0 ? negative / sum : 0.33,
        neutral: sum > 0 ? neutral / sum : 0.34
      };
    } else {
      // 默认中立情感
      sentiment = { positive: 0.33, negative: 0.33, neutral: 0.34 };
    }

    // 构建事件实体
    const eventEntity = new EventEntity();
    eventEntity.title = generatedEvent.title;
    eventEntity.description = generatedEvent.description || null;
    eventEntity.category_id = generatedEvent.category_id;
    eventEntity.sentiment = sentiment;
    eventEntity.hotness = generatedEvent.hotness ?? 0;
    eventEntity.status = generatedEvent.status || 'active';
    eventEntity.seed_url = generatedEvent.seed_url || null;
    eventEntity.occurred_at = parseBeijingTime(generatedEvent.occurred_at);
    eventEntity.peak_at = parseBeijingTime(generatedEvent.peak_at);
    eventEntity.keywords = generatedEvent.keywords || [];

    // 保存到数据库
    const savedEvent = await manager.save(EventEntity, eventEntity);

    console.log('[EventAuthGenerateAstVisitor] 事件已保存到数据库:', savedEvent.id);
    return savedEvent;
  });
}

/**
 * 检查并更新已存在事件的不合理属性
 */
export async function updateEventIfNeeded(
  existingEvent: EventEntity,
  generatedEvent: LLMGeneratedEvent
): Promise<EventEntity> {
  try {
    const updates: Partial<EventEntity> = {};
    const reasons: string[] = [];

    // 1. 检查关键词是否需要更新
    if (shouldUpdateKeywords(existingEvent.keywords, generatedEvent.keywords)) {
      updates.keywords = generatedEvent.keywords || [];
      reasons.push('关键词');
    }

    // 2. 检查描述是否需要更新（现有为空或太短）
    if (shouldUpdateDescription(existingEvent.description, generatedEvent.description)) {
      updates.description = generatedEvent.description || null;
      reasons.push('描述');
    }

    // 3. 检查热度是否需要更新（新的更高）
    if (generatedEvent.hotness && generatedEvent.hotness > (existingEvent.hotness || 0)) {
      updates.hotness = generatedEvent.hotness;
      reasons.push('热度');
    }

    // 4. 检查时间是否需要更新（现有为空）
    if (!existingEvent.occurred_at && generatedEvent.occurred_at) {
      const parsedTime = parseBeijingTime(generatedEvent.occurred_at);
      if (parsedTime) {
        updates.occurred_at = parsedTime;
        reasons.push('发生时间');
      }
    }

    if (!existingEvent.peak_at && generatedEvent.peak_at) {
      const parsedTime = parseBeijingTime(generatedEvent.peak_at);
      if (parsedTime) {
        updates.peak_at = parsedTime;
        reasons.push('峰值时间');
      }
    }

    // 如果没有需要更新的，直接返回
    if (Object.keys(updates).length === 0) {
      console.log('[EventAuthGenerateAstVisitor] 现有事件属性合理，无需更新');
      return existingEvent;
    }

    // 执行更新
    console.log(`[EventAuthGenerateAstVisitor] 更新事件属性: ${reasons.join(', ')}`);

    return await useEntityManager(async (manager) => {
      await manager.update(EventEntity, existingEvent.id, updates);
      const updated = await manager.findOne(EventEntity, { where: { id: existingEvent.id } });
      // 如果查询失败，返回原事件（合并更新字段）
      if (!updated) {
        console.warn('[EventAuthGenerateAstVisitor] 更新后查询失败，返回合并数据');
        return { ...existingEvent, ...updates } as EventEntity;
      }
      return updated;
    });
  } catch (error) {
    // 更新失败不应该中断流程，返回原事件
    console.error('[EventAuthGenerateAstVisitor] 更新事件属性失败:', error);
    return existingEvent;
  }
}
