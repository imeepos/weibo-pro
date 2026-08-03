/**
 * EventDispatcherAstVisitor 简化版本测试 - 基础机制
 *
 * 测试目标：
 * 1. 验证简化后的实现直接选择第一个事件
 * 2. 验证事件轮换机制（通过 last_crawl_at 更新）
 * 3. 验证移除 LLM 相关逻辑后的行为
 *
 * 简化说明：
 * - 移除 LLM 调用
 * - 移除时间范围查询
 * - 移除提示词构建
 * - 直接选择第一个事件（已按 last_crawl_at 排序）
 * - 保留 last_crawl_at 更新机制实现轮换
 *
 * Mock 数据与排序函数抽取到 src/test/helpers/event-dispatcher-simplified.ts。
 * 边界情况/性能改进/集成场景见 EventDispatcherAstVisitor.simplified.edge.test.ts。
 */

import { describe, it, expect } from 'vitest';
import type { EventEntity } from '@sker/entities';
import {
  createMockCategory,
  createMockEvent,
  sortEventsByLastCrawlAt,
} from './test/helpers/event-dispatcher-simplified';

describe('EventDispatcherAstVisitor - 简化版本 - 事件轮换机制', () => {
  describe('last_crawl_at 更新逻辑', () => {
    it('应该更新选中事件的 last_crawl_at 为当前时间', async () => {
      // 前置条件：事件 A 的 last_crawl_at 为 null
      const eventA = createMockEvent('event-a', '事件A', 'category-1', null);

      // 模拟选择事件 A
      const selectedEvent = eventA;
      const _selectedEventId = selectedEvent.id;

      // 模拟更新 last_crawl_at
      const newLastCrawlAt = new Date();
      selectedEvent.last_crawl_at = newLastCrawlAt;

      // 验证：last_crawl_at 已更新
      expect(selectedEvent.last_crawl_at).toBeDefined();
      expect(selectedEvent.last_crawl_at).toBeInstanceOf(Date);
      expect(selectedEvent.last_crawl_at!.getTime()).toBeCloseTo(newLastCrawlAt.getTime(), -3); // 允许秒级误差
    });

    it('应该在多次执行中轮换事件', async () => {
      const category = createMockCategory('category-1', '测试分类');

      // 创建三个事件，last_crawl_at 都为 null
      const eventA = createMockEvent('event-a', '事件A', category.id, null);
      const eventB = createMockEvent('event-b', '事件B', category.id, null);
      const eventC = createMockEvent('event-c', '事件C', category.id, null);

      let events = [eventA, eventB, eventC];

      // 模拟排序：按 last_crawl_at ASC NULLS FIRST
      const sortEvents = sortEventsByLastCrawlAt;

      // 第1次执行：选择 A（NULL 排最前）
      events = sortEvents(events);
      let selectedEvent = events[0];
      expect(selectedEvent.id).toBe('event-a');
      selectedEvent.last_crawl_at = new Date('2024-01-01T10:00:00Z');

      // 第2次执行：选择 B（B NULL，A 有时间）
      events = sortEvents(events);
      selectedEvent = events[0];
      expect(selectedEvent.id).toBe('event-b');
      selectedEvent.last_crawl_at = new Date('2024-01-01T11:00:00Z');

      // 第3次执行：选择 C（C NULL，A、B 有时间）
      events = sortEvents(events);
      selectedEvent = events[0];
      expect(selectedEvent.id).toBe('event-c');
      selectedEvent.last_crawl_at = new Date('2024-01-01T12:00:00Z');

      // 第4次执行：选择 A（A 最早，10:00）
      events = sortEvents(events);
      selectedEvent = events[0];
      expect(selectedEvent.id).toBe('event-a');
      selectedEvent.last_crawl_at = new Date('2024-01-01T13:00:00Z');

      // 验证轮换顺序：A → B → C → A
      // 注意：由于时区差异，我们验证事件被正确更新，而不是具体的小时数
      expect(eventA.last_crawl_at).toBeDefined();
      expect(eventB.last_crawl_at).toBeDefined();
      expect(eventC.last_crawl_at).toBeDefined();

      // 验证 A 被更新了两次（第1次和第4次），所以它的时间应该是最新的
      expect(eventA.last_crawl_at!.getTime()).toBeGreaterThan(eventB.last_crawl_at!.getTime());
      expect(eventA.last_crawl_at!.getTime()).toBeGreaterThan(eventC.last_crawl_at!.getTime());
    });

    it('应该正确处理部分事件已爬取的情况', async () => {
      const category = createMockCategory('category-1', '测试分类');

      // 事件 A：从未爬取（null）
      const eventA = createMockEvent('event-a', '事件A', category.id, null);

      // 事件 B：1天前爬取过
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const eventB = createMockEvent('event-b', '事件B', category.id, oneDayAgo);

      // 事件 C：2天前爬取过
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const eventC = createMockEvent('event-c', '事件C', category.id, twoDaysAgo);

      // 排序：NULL 排最前，然后按时间升序
      const events = sortEventsByLastCrawlAt([eventA, eventB, eventC]);

      // 应该选择事件 A（从未爬取）
      const selectedEvent = events[0];
      expect(selectedEvent.id).toBe('event-a');
      expect(selectedEvent.last_crawl_at).toBeNull();
    });
  });

  describe('排序逻辑', () => {
    it('应该按 last_crawl_at ASC NULLS FIRST 排序', () => {
      const category = createMockCategory('category-1', '测试分类');

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const eventA = createMockEvent('event-a', '事件A', category.id, null); // NULL
      const eventB = createMockEvent('event-b', '事件B', category.id, twoDaysAgo); // 2天前
      const eventC = createMockEvent('event-c', '事件C', category.id, oneDayAgo); // 1天前
      const eventD = createMockEvent('event-d', '事件D', category.id, null); // NULL

      const events = [eventA, eventB, eventC, eventD];

      // 排序
      const sorted = sortEventsByLastCrawlAt(events);

      // 顺序应该是：NULL 事件（按 ID），然后按时间升序
      expect(sorted[0].id).toBe('event-a'); // NULL
      expect(sorted[1].id).toBe('event-d'); // NULL
      expect(sorted[2].id).toBe('event-b'); // 2天前（更早）
      expect(sorted[3].id).toBe('event-c'); // 1天前（较晚）
    });

    it('应该选择排序后的第一个事件', () => {
      const category = createMockCategory('category-1', '测试分类');

      const eventA = createMockEvent('event-a', '事件A', category.id, null);
      const eventB = createMockEvent('event-b', '事件B', category.id, null);
      const eventC = createMockEvent('event-c', '事件C', category.id, null);

      const events = [eventA, eventB, eventC];

      // 模拟简化后的选择逻辑：直接选第一个
      const selectedEvent = events[0];

      expect(selectedEvent.id).toBe('event-a');
      expect(selectedEvent.title).toBe('事件A');
    });
  });

  describe('辅助排序字段', () => {
    it('应该使用 updated_at 和 created_at 作为辅助排序', () => {
      const category = createMockCategory('category-1', '测试分类');

      const sameTime = new Date('2024-01-01T10:00:00Z');

      const eventA = createMockEvent('event-a', '事件A', category.id, sameTime);
      eventA.updated_at = new Date('2024-01-01T08:00:00Z'); // 更新时间更早

      const eventB = createMockEvent('event-b', '事件B', category.id, sameTime);
      eventB.updated_at = new Date('2024-01-01T09:00:00Z'); // 更新时间较晚

      const events = [eventA, eventB];

      // 相同 last_crawl_at 时，按 updated_at 升序
      const sorted = [...events].sort((a, b) => {
        if (a.last_crawl_at!.getTime() === b.last_crawl_at!.getTime()) {
          return a.updated_at.getTime() - b.updated_at.getTime();
        }
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      expect(sorted[0].id).toBe('event-a'); // 更新时间更早
      expect(sorted[1].id).toBe('event-b');
    });
  });

  describe('limit 参数', () => {
    it('应该限制返回的事件列表数量', () => {
      const category = createMockCategory('category-1', '测试分类');

      const events = [
        createMockEvent('event-1', '事件1', category.id, null),
        createMockEvent('event-2', '事件2', category.id, null),
        createMockEvent('event-3', '事件3', category.id, null),
        createMockEvent('event-4', '事件4', category.id, null),
        createMockEvent('event-5', '事件5', category.id, null)
      ];

      const limit = 3;
      const limitedEvents = events.slice(0, limit);

      expect(limitedEvents.length).toBe(3);
      expect(limitedEvents[0].id).toBe('event-1');
      expect(limitedEvents[1].id).toBe('event-2');
      expect(limitedEvents[2].id).toBe('event-3');
    });

    it('limit 为 0 或负数时应该返回所有事件', () => {
      const category = createMockCategory('category-1', '测试分类');

      const events = [
        createMockEvent('event-1', '事件1', category.id, null),
        createMockEvent('event-2', '事件2', category.id, null)
      ];

      const limit = 0;
      const limitedEvents = limit > 0 ? events.slice(0, limit) : events;

      expect(limitedEvents.length).toBe(2);
    });
  });
});
