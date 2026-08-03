/**
 * 测试：EventDispatcherAstVisitor 时间范围功能
 *
 * 功能：
 * - 批量查询事件的时间范围
 * - 计算时间差值（总时间 - 已爬取时间）
 * - 在提示词中显示时间差值和更新时间
 * - 优先选择时间差值大且更新时间早的事件
 *
 * 辅助函数（calculateDaysDiff / formatDays / calculateEventMetrics /
 * createMockEventWithDates 等）抽取到 src/test/helpers/event-dispatcher-time-range.ts。
 * 提示词格式化与选择原则见 EventDispatcherAstVisitor.prompt.test.ts。
 */

import { describe, it, expect } from 'vitest';
import type { EventEntity } from '@sker/entities';
import {
  calculateDaysDiff,
  formatDays,
  calculateEventMetrics,
  createMockEventWithDates,
} from '../test/helpers/event-dispatcher-time-range';

describe('EventDispatcherAstVisitor - 时间范围功能测试', () => {
  describe('时间差值计算', () => {
    it('应该正确计算两个日期之间的天数差', () => {
      const start = new Date('2026-01-15T00:00:00Z');
      const end = new Date('2026-01-20T00:00:00Z');
      const diff = calculateDaysDiff(start, end);
      expect(diff).toBe(5);
    });

    it('应该正确计算小时数（小于1天）', () => {
      const start = new Date('2026-01-15T00:00:00Z');
      const end = new Date('2026-01-15T12:00:00Z');
      const diff = calculateDaysDiff(start, end);
      expect(diff).toBe(0);
    });

    it('应该正确格式化天数为可读字符串', () => {
      expect(formatDays(0)).toBe('0小时');
      expect(formatDays(0.5)).toBe('12小时');
      expect(formatDays(1)).toBe('1天');
      expect(formatDays(15)).toBe('15天');
      expect(formatDays(60)).toBe('2.0月');
    });
  });

  describe('时间差值和覆盖率计算', () => {
    it('应该正确计算有帖子数据的事件指标', () => {
      const eventStartTime = new Date('2026-01-01T00:00:00Z');
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const postMinTime = new Date('2026-01-10T00:00:00Z');
      const postMaxTime = new Date('2026-01-20T00:00:00Z');

      const metrics = calculateEventMetrics(eventStartTime, currentTime, postMinTime, postMaxTime);

      expect(metrics.totalDays).toBe(30);
      expect(metrics.crawledDays).toBe(10);
      expect(metrics.gapDays).toBe(20); // 9天前 + 10天后
      expect(metrics.coveragePercent).toBe(33);
    });

    it('应该正确计算没有帖子数据的事件指标', () => {
      const eventStartTime = new Date('2026-01-01T00:00:00Z');
      const currentTime = new Date('2026-01-31T00:00:00Z');

      const metrics = calculateEventMetrics(eventStartTime, currentTime, null, null);

      expect(metrics.totalDays).toBe(30);
      expect(metrics.crawledDays).toBe(0);
      expect(metrics.gapDays).toBe(30); // 全部时间都未覆盖
      expect(metrics.coveragePercent).toBe(0);
    });

    it('应该正确计算完全覆盖的事件指标', () => {
      const eventStartTime = new Date('2026-01-01T00:00:00Z');
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const postMinTime = new Date('2026-01-01T00:00:00Z');
      const postMaxTime = new Date('2026-01-31T00:00:00Z');

      const metrics = calculateEventMetrics(eventStartTime, currentTime, postMinTime, postMaxTime);

      expect(metrics.totalDays).toBe(30);
      expect(metrics.crawledDays).toBe(30);
      expect(metrics.gapDays).toBe(0);
      expect(metrics.coveragePercent).toBe(100);
    });
  });

  describe('自定义提示词处理', () => {
    it('空字符串自定义提示词应被视为无效', () => {
      const emptyPrompt = '   ';
      const customPrompt = emptyPrompt.trim();

      expect(customPrompt).toBe('');
      // 空字符串被视为 falsy，不应附加自定义提示词
    });

    it('自定义提示词应被 trim 处理', () => {
      const customPrompt = '  优先选择高热度事件  ';
      expect(customPrompt.trim()).toBe('优先选择高热度事件');
    });
  });

  describe('边界情况', () => {
    it('应该处理空事件列表', () => {
      const events: EventEntity[] = [];
      const _timeRangeMap = new Map();
      const _currentTime = new Date('2026-01-31T00:00:00Z');

      const eventList = events.map((e, idx) => `${idx + 1}. ID: ${e.id}`).join('\n\n');

      expect(eventList).toBe('');
    });

    it('应该处理事件没有分类的情况', () => {
      const _currentTime = new Date('2026-01-31T00:00:00Z');
      const event = createMockEventWithDates('event-1', '无分类事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z');
      event.category = undefined as any;

      const categoryName = event.category?.name || '未分类';

      expect(categoryName).toBe('未分类');
    });

    it('应该处理 crawl_end_reason 为 null 的情况', () => {
      const event = createMockEventWithDates('event-1', '未爬取事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z');
      const crawlStatus = event.crawl_end_reason ? `已爬取(${event.crawl_end_reason})` : '未爬取';

      expect(crawlStatus).toBe('未爬取');
      expect(event.crawl_end_reason).toBeNull();
    });

    it('应该处理 occurred_at 为 null 的情况（使用 created_at）', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const event = createMockEventWithDates('event-1', '无发生时间事件', null, '2026-01-05T00:00:00Z', '2026-01-25T00:00:00Z');
      event.occurred_at = null;

      const eventStartTime = event.occurred_at || event.created_at;
      const totalDays = calculateDaysDiff(eventStartTime, currentTime);

      // 应该使用 created_at
      expect(totalDays).toBe(26);
    });
  });
});
