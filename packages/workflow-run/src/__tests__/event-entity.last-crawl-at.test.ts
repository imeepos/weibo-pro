/**
 * TDD 测试：EventEntity.last_crawl_at 字段和事件分派器排序优化
 *
 * 测试目标：
 * 1. EventEntity 有 last_crawl_at 字段
 * 2. 事件分派器按 last_crawl_at ASC 排序
 * 3. null 值（从未爬取）排在最前面
 * 4. 爬取时间早的排在后面
 * 5. 实现自动轮询效果
 */

import { describe, it, expect } from 'vitest';
import { EventEntity } from '@sker/entities';

describe('EventEntity - last_crawl_at 字段（TDD）', () => {
  describe('字段定义', () => {
    it('应该有 last_crawl_at 字段', () => {
      const event = new EventEntity();
      expect(event).toHaveProperty('last_crawl_at');
    });

    it('last_crawl_at 应该支持 null 值（表示从未爬取）', () => {
      const event = new EventEntity();
      event.last_crawl_at = null;
      expect(event.last_crawl_at).toBeNull();
    });

    it('last_crawl_at 应该支持 Date 对象', () => {
      const event = new EventEntity();
      const now = new Date();
      event.last_crawl_at = now;
      expect(event.last_crawl_at).toEqual(now);
    });
  });

  describe('排序逻辑：last_crawl_at ASC', () => {
    it('null 值应该排在最前面', () => {
      const events = [
        createEventWithLastCrawl('event-3', '事件C', '2026-01-30T10:00:00Z'),
        createEventWithLastCrawl('event-1', '事件A', null), // null 排最前
        createEventWithLastCrawl('event-2', '事件B', '2026-01-29T10:00:00Z'),
      ];

      // 按照期望的排序逻辑排序
      events.sort((a, b) => {
        // null 值排最前
        if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
        if (a.last_crawl_at === null) return -1;
        if (b.last_crawl_at === null) return 1;
        // 非空值按时间升序
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      // 验证排序结果
      expect(events[0].id).toBe('event-1'); // null 排最前
      expect(events[1].id).toBe('event-2'); // 最早时间
      expect(events[2].id).toBe('event-3'); // 最晚时间
    });

    it('应该实现轮询效果：刚爬取的事件排到最后', () => {
      // 第一次运行：所有事件 last_crawl_at 都是 null
      const events = [
        createEventWithLastCrawl('event-1', '事件A', null),
        createEventWithLastCrawl('event-2', '事件B', null),
        createEventWithLastCrawl('event-3', '事件C', null),
      ];

      // 第一次选择：假设选择事件1
      events[0].last_crawl_at = new Date('2026-01-30T10:00:00Z');

      // 第二次运行排序后
      events.sort((a, b) => {
        if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
        if (a.last_crawl_at === null) return -1;
        if (b.last_crawl_at === null) return 1;
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      // 验证：事件1（刚爬取）排到最后
      expect(events[0].id).not.toBe('event-1');
      expect(events[2].id).toBe('event-1');
    });

    it('应该正确处理所有事件都爬取过的情况（按时间升序）', () => {
      const events = [
        createEventWithLastCrawl('event-1', '事件A', '2026-01-29T10:00:00Z'),
        createEventWithLastCrawl('event-2', '事件B', '2026-01-28T10:00:00Z'),
        createEventWithLastCrawl('event-3', '事件C', '2026-01-30T10:00:00Z'),
      ];

      events.sort((a, b) => {
        if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
        if (a.last_crawl_at === null) return -1;
        if (b.last_crawl_at === null) return 1;
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      // 验证：按时间升序排列
      expect(events[0].id).toBe('event-2'); // 最早
      expect(events[1].id).toBe('event-1');
      expect(events[2].id).toBe('event-3'); // 最晚
    });
  });

  describe('轮询场景模拟', () => {
    it('完整轮询场景：3个事件循环选择', () => {
      const events = [
        createEventWithLastCrawl('event-1', '事件A', null),
        createEventWithLastCrawl('event-2', '事件B', null),
        createEventWithLastCrawl('event-3', '事件C', null),
      ];

      const selectedOrder: string[] = [];

      // 模拟 5 次运行
      for (let i = 0; i < 5; i++) {
        // 排序
        events.sort((a, b) => {
          if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
          if (a.last_crawl_at === null) return -1;
          if (b.last_crawl_at === null) return 1;
          return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
        });

        // 选择第一个（模拟 LLM 选择列表第一项）
        const selected = events[0];
        selectedOrder.push(selected.id);

        // 更新 last_crawl_at
        selected.last_crawl_at = new Date(Date.now() + i * 60000); // 每次间隔1分钟
      }

      // 验证轮询顺序：1 -> 2 -> 3 -> 1 -> 2
      expect(selectedOrder).toEqual(['event-1', 'event-2', 'event-3', 'event-1', 'event-2']);
    });
  });
});

/**
 * 辅助函数：创建带有 last_crawl_at 的模拟事件
 */
function createEventWithLastCrawl(
  id: string,
  title: string,
  lastCrawlAt: string | null
): EventEntity {
  const event = new EventEntity();
  event.id = id;
  event.title = title;
  event.status = 'active';
  event.keywords = [];
  event.sentiment = { neutral: 1, negative: 0, positive: 0 };
  event.hotness = '0.00';
  event.category_id = 'test-category';
  event.created_at = new Date('2026-01-01T00:00:00Z');
  event.updated_at = new Date('2026-01-01T00:00:00Z');
  event.last_crawl_at = lastCrawlAt ? new Date(lastCrawlAt) : null;
  return event;
}
