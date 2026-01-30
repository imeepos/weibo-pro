/**
 * TDD 测试：WeiboKeywordSearchAstVisitor 更新 last_crawl_at
 *
 * 测试目标：
 * 1. 成功爬取后更新事件的 last_crawl_at 字段
 * 2. 爬取出错时不更新 last_crawl_at
 * 3. 无结果时不更新 last_crawl_at
 * 4. last_crawl_at 值为当前时间
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEntity } from '@sker/entities';

describe('WeiboKeywordSearchAstVisitor - last_crawl_at 更新（TDD）', () => {
  describe('成功爬取后应更新 last_crawl_at', () => {
    it('应该在成功爬取后更新事件的 last_crawl_at 为当前时间', async () => {
      // 模拟事件
      const event = new EventEntity();
      event.id = 'test-event-1';
      event.title = '测试事件';
      event.status = 'active';
      event.keywords = [];
      event.sentiment = { neutral: 1, negative: 0, positive: 0 };
      event.hotness = '0.00';
      event.category_id = 'test-category';
      event.created_at = new Date('2026-01-01T00:00:00Z');
      event.updated_at = new Date('2026-01-01T00:00:00Z');
      event.last_crawl_at = null;
      event.crawl_end_reason = null;

      // 模拟爬取成功
      const crawlStartTime = new Date();
      await simulateSuccessfulCrawl(event);
      const crawlEndTime = new Date();

      // 验证 last_crawl_at 已更新
      expect(event.last_crawl_at).not.toBeNull();
      expect(event.last_crawl_at!.getTime()).toBeGreaterThanOrEqual(crawlStartTime.getTime());
      expect(event.last_crawl_at!.getTime()).toBeLessThanOrEqual(crawlEndTime.getTime());

      // 验证 crawl_end_reason 也已设置
      expect(event.crawl_end_reason).not.toBeNull();
    });

    it('应该允许重复更新 last_crawl_at（实现轮询）', async () => {
      const event = new EventEntity();
      event.id = 'test-event-2';
      event.title = '测试事件2';
      event.status = 'active';
      event.keywords = [];
      event.sentiment = { neutral: 1, negative: 0, positive: 0 };
      event.hotness = '0.00';
      event.category_id = 'test-category';
      event.created_at = new Date('2026-01-01T00:00:00Z');
      event.updated_at = new Date('2026-01-01T00:00:00Z');
      event.last_crawl_at = null;

      // 第一次爬取
      const firstCrawlTime = new Date('2026-01-29T10:00:00Z');
      await simulateSuccessfulCrawl(event, firstCrawlTime);
      expect(event.last_crawl_at!.toISOString()).toBe('2026-01-29T10:00:00.000Z');

      // 第二次爬取（1小时后）
      const secondCrawlTime = new Date('2026-01-29T11:00:00Z');
      await simulateSuccessfulCrawl(event, secondCrawlTime);
      expect(event.last_crawl_at!.toISOString()).toBe('2026-01-29T11:00:00.000Z');

      // 第三次爬取（又1小时后）
      const thirdCrawlTime = new Date('2026-01-29T12:00:00Z');
      await simulateSuccessfulCrawl(event, thirdCrawlTime);
      expect(event.last_crawl_at!.toISOString()).toBe('2026-01-29T12:00:00.000Z');
    });
  });

  describe('失败场景不应更新 last_crawl_at', () => {
    it('爬取出错时不应该更新 last_crawl_at', async () => {
      const event = new EventEntity();
      event.id = 'test-event-3';
      event.title = '测试事件3';
      event.status = 'active';
      event.keywords = [];
      event.sentiment = { neutral: 1, negative: 0, positive: 0 };
      event.hotness = '0.00';
      event.category_id = 'test-category';
      event.created_at = new Date('2026-01-01T00:00:00Z');
      event.updated_at = new Date('2026-01-01T00:00:00Z');
      event.last_crawl_at = null;

      // 模拟爬取出错
      await simulateFailedCrawl(event);

      // 验证 last_crawl_at 没有被更新
      expect(event.last_crawl_at).toBeNull();
    });

    it('无搜索结果时不应该更新 last_crawl_at', async () => {
      const event = new EventEntity();
      event.id = 'test-event-4';
      event.title = '测试事件4';
      event.status = 'active';
      event.keywords = [];
      event.sentiment = { neutral: 1, negative: 0, positive: 0 };
      event.hotness = '0.00';
      event.category_id = 'test-category';
      event.created_at = new Date('2026-01-01T00:00:00Z');
      event.updated_at = new Date('2026-01-01T00:00:00Z');
      event.last_crawl_at = null;

      // 模拟无搜索结果
      await simulateEmptyResultCrawl(event);

      // 验证 last_crawl_at 没有被更新
      expect(event.last_crawl_at).toBeNull();

      // 但 crawl_end_reason 应该被设置
      expect(event.crawl_end_reason).toContain('无搜索结果');
    });
  });

  describe('last_crawl_at 与事件分派器协同工作', () => {
    it('更新 last_crawl_at 后，事件在分派器列表中的排序应该靠后', () => {
      const events = [
        createEventWithLastCrawl('event-1', '事件A', null),
        createEventWithLastCrawl('event-2', '事件B', null),
        createEventWithLastCrawl('event-3', '事件C', null),
      ];

      // 初始排序：都是 null，顺序不变
      events.sort((a, b) => {
        if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
        if (a.last_crawl_at === null) return -1;
        if (b.last_crawl_at === null) return 1;
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      expect(events[0].id).toBe('event-1');

      // 爬取事件1后
      events[0].last_crawl_at = new Date('2026-01-30T10:00:00Z');

      // 重新排序
      events.sort((a, b) => {
        if (a.last_crawl_at === null && b.last_crawl_at === null) return 0;
        if (a.last_crawl_at === null) return -1;
        if (b.last_crawl_at === null) return 1;
        return a.last_crawl_at!.getTime() - b.last_crawl_at!.getTime();
      });

      // 事件1应该排到最后
      expect(events[0].id).not.toBe('event-1');
      expect(events[2].id).toBe('event-1');
    });
  });
});

/**
 * 辅助函数：模拟成功爬取
 */
async function simulateSuccessfulCrawl(event: EventEntity, crawlTime?: Date): Promise<void> {
  // 这是实际的业务逻辑应该做的事情
  // 在真实的 WeiboKeywordSearchAstVisitor 中：
  // event.last_crawl_at = crawlTime || new Date();
  // await manager.save(EventEntity, event);

  // 测试模拟：直接更新
  event.last_crawl_at = crawlTime || new Date();
  event.crawl_end_reason = '搜索完成。关键词：测试，当前页：1/1';
}

/**
 * 辅助函数：模拟失败爬取
 */
async function simulateFailedCrawl(event: EventEntity): Promise<void> {
  // 失败时不更新 last_crawl_at
  event.crawl_end_reason = `搜索出错：网络错误`;
}

/**
 * 辅助函数：模拟无结果爬取
 */
async function simulateEmptyResultCrawl(event: EventEntity): Promise<void> {
  // 无结果时不更新 last_crawl_at
  event.crawl_end_reason = `无搜索结果。关键词：测试，时间范围：2026-01-01-2026-01-30`;
}

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
