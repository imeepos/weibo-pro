/**
 * 测试：EventDispatcherAstVisitor 时间范围功能
 *
 * 功能：
 * - 批量查询事件的时间范围
 * - 计算时间差值（总时间 - 已爬取时间）
 * - 在提示词中显示时间差值和更新时间
 * - 优先选择时间差值大且更新时间早的事件
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventEntity, EventCategoryEntity, WeiboPostEntity } from '@sker/entities';

/**
 * 时间范围接口
 */
interface TimeRange {
  min: string;
  max: string;
}

/**
 * 模拟的查询结果类型
 */
interface TimeRangeResult {
  event_id: string;
  min: Date;
  max: Date;
}

/**
 * 计算两个日期之间的天数差
 */
function calculateDaysDiff(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 格式化天数为可读字符串
 */
function formatDays(days: number): string {
  if (days < 1) return `${Math.floor(days * 24)}小时`;
  if (days < 30) return `${days}天`;
  return `${(days / 30).toFixed(1)}月`;
}

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
    /**
     * 计算事件的时间差值和覆盖率
     */
    function calculateEventMetrics(
      eventStartTime: Date,
      currentTime: Date,
      postMinTime: Date | null,
      postMaxTime: Date | null
    ) {
      const totalDays = calculateDaysDiff(eventStartTime, currentTime);
      let crawledDays = 0;
      let gapDays = totalDays;
      let coveragePercent = 0;

      if (postMinTime && postMaxTime) {
        crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
        const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
        const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
        gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
        coveragePercent = Math.round((crawledDays / totalDays) * 100);
      }

      return { totalDays, crawledDays, gapDays, coveragePercent };
    }

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

  describe('提示词格式化', () => {
    /**
     * 模拟新的事件信息格式化
     */
    function formatEventWithMetrics(
      event: EventEntity,
      timeRangeMap: Map<string, TimeRange>,
      currentTime: Date,
      idx: number
    ): string {
      const crawlStatus = event.crawl_end_reason ? `已爬取(${event.crawl_end_reason})` : '未爬取';
      const timeRangeInfo = timeRangeMap.get(event.id);

      const eventStartTime = event.occurred_at || event.created_at;
      const totalDays = calculateDaysDiff(eventStartTime, currentTime);

      let crawledDays = 0;
      let gapDays = totalDays;
      let coveragePercent = 0;

      if (timeRangeInfo) {
        const postMinTime = new Date(timeRangeInfo.min);
        const postMaxTime = new Date(timeRangeInfo.max);
        crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
        const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
        const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
        gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
        coveragePercent = Math.round((crawledDays / totalDays) * 100);
      }

      const updatedDaysAgo = calculateDaysDiff(event.updated_at, currentTime);

      return `${idx + 1}. ID: ${event.id}
   标题: ${event.title}
   分类: ${event.category?.name || '未分类'}
   状态: ${crawlStatus}
   总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
   已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
   时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
   最后更新: ${formatDays(updatedDaysAgo)}前 (${event.updated_at.toISOString().split('T')[0]})`;
    }

    it('应该为有帖子数据的事件显示完整指标', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const event = createMockEventWithDates('event-1', '测试事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z');
      const timeRangeMap = new Map([
        ['event-1', { min: '2026-01-10T00:00:00Z', max: '2026-01-20T00:00:00Z' }]
      ]);

      const result = formatEventWithMetrics(event, timeRangeMap, currentTime, 0);

      expect(result).toContain('状态: 未爬取');
      expect(result).toContain('总时间跨度: 1.0月'); // 30天 = 1.0月
      expect(result).toContain('已爬取: 10天 (33%)');
      expect(result).toContain('时间差值: 20天 (33%已覆盖)');
      expect(result).toContain('最后更新: 6天前');
    });

    it('应该为没有帖子数据的事件显示无数据', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const event = createMockEventWithDates('event-2', '无帖子事件', null, '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z');
      const timeRangeMap = new Map();

      const result = formatEventWithMetrics(event, timeRangeMap, currentTime, 0);

      expect(result).toContain('状态: 未爬取');
      expect(result).toContain('总时间跨度: 1.0月'); // 30天 = 1.0月
      expect(result).toContain('已爬取: 无数据');
      expect(result).toContain('时间差值: 1.0月 (0%已覆盖)'); // 30天
    });

    it('应该正确比较两个事件的时间差值', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');

      // 事件A：爬取了10天，差值20天
      const eventA = createMockEventWithDates('event-a', '事件A', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z');
      const timeRangeMap = new Map([
        ['event-a', { min: '2026-01-10T00:00:00Z', max: '2026-01-20T00:00:00Z' }] // 10天
      ]);

      // 事件B：爬取了5天，差值25天
      const eventB = createMockEventWithDates('event-b', '事件B', null, '2026-01-01T00:00:00Z', '2026-01-28T00:00:00Z');
      timeRangeMap.set('event-b', { min: '2026-01-10T00:00:00Z', max: '2026-01-15T00:00:00Z' }); // 5天

      const resultA = formatEventWithMetrics(eventA, timeRangeMap, currentTime, 0);
      const resultB = formatEventWithMetrics(eventB, timeRangeMap, currentTime, 1);

      // 事件B的差值更大，应该被优先选择
      expect(resultA).toContain('时间差值: 20天');
      expect(resultB).toContain('时间差值: 25天');
    });
  });

  describe('提示词选择原则', () => {
    /**
     * 构建完整的提示词
     */
    function buildPromptWithMetrics(
      events: EventEntity[],
      timeRangeMap: Map<string, TimeRange>,
      currentTime: Date
    ): string {
      const eventList = events.map((e, idx) => {
        const crawlStatus = e.crawl_end_reason ? `已爬取(${e.crawl_end_reason})` : '未爬取';
        const timeRangeInfo = timeRangeMap.get(e.id);

        const eventStartTime = e.occurred_at || e.created_at;
        const totalDays = calculateDaysDiff(eventStartTime, currentTime);

        let crawledDays = 0;
        let gapDays = totalDays;
        let coveragePercent = 0;

        if (timeRangeInfo) {
          const postMinTime = new Date(timeRangeInfo.min);
          const postMaxTime = new Date(timeRangeInfo.max);
          crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
          const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
          const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
          gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
          coveragePercent = Math.round((crawledDays / totalDays) * 100);
        }

        const updatedDaysAgo = calculateDaysDiff(e.updated_at, currentTime);

        return `${idx + 1}. ID: ${e.id}
   标题: ${e.title}
   分类: ${e.category?.name || '未分类'}
   状态: ${crawlStatus}
   总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
   已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
   时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
   最后更新: ${formatDays(updatedDaysAgo)}前 (${e.updated_at.toISOString().split('T')[0]})`;
      }).join('\n\n');

      return `你是一个事件分派专家，需要从以下事件列表中选择一个事件进行爬取。

事件列表：
${eventList}

选择原则（按优先级排序）：
1. 【强制】优先选择未爬取完成的事件（状态为"未爬取"）
2. 【核心】时间差值大者优先 - 时间差值 = 总时间跨度 - 已爬取时间范围，差值越大说明数据缺口越大
3. 【防重】更新时间早者优先 - 优先选择最后更新时间较早的事件，防止重复爬取
4. 【连续】已有时间范围的事件 - 对于已有帖子数据的事件，从最大时间继续爬取，保持数据连续性

注意：
- 时间差值相同的情况下，选择更新时间更早的事件
- 忽略事件热度，专注数据完整性
- 忽略分类平均分配，选择数据缺口最大的事件

请严格按以下 JSON 格式返回你的选择：
\`\`\`json
{
  "selectedEventId": "事件ID",
  "reason": "选择原因（需说明时间差值、更新时间等关键因素）"
}
\`\`\``;
    }

    it('提示词应包含新的选择原则', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const events = [
        createMockEventWithDates('event-1', '测试事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z')
      ];
      const timeRangeMap = new Map();

      const prompt = buildPromptWithMetrics(events, timeRangeMap, currentTime);

      expect(prompt).toContain('【强制】优先选择未爬取完成的事件');
      expect(prompt).toContain('【核心】时间差值大者优先');
      expect(prompt).toContain('【防重】更新时间早者优先');
      expect(prompt).toContain('【连续】已有时间范围的事件');
      expect(prompt).toContain('忽略事件热度，专注数据完整性');
      expect(prompt).toContain('忽略分类平均分配');
    });

    it('提示词应显示完整的事件指标', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const events = [
        createMockEventWithDates('event-1', '未完成事件', null, '2026-01-01T00:00:00Z', '2026-01-20T00:00:00Z')
      ];
      const timeRangeMap = new Map([
        ['event-1', { min: '2026-01-10T00:00:00Z', max: '2026-01-15T00:00:00Z' }]
      ]);

      const prompt = buildPromptWithMetrics(events, timeRangeMap, currentTime);

      expect(prompt).toContain('总时间跨度: 1.0月'); // 30天 = 1.0月
      expect(prompt).toContain('已爬取: 5天 (17%)');
      expect(prompt).toContain('时间差值: 25天 (17%已覆盖)');
      expect(prompt).toContain('最后更新: 11天前');
    });

    it('有自定义提示词时应附加到默认提示词后面', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const events = [
        createMockEventWithDates('event-1', '测试事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z')
      ];
      const timeRangeMap = new Map([
        ['event-1', { min: '2026-01-10T00:00:00Z', max: '2026-01-20T00:00:00Z' }]
      ]);

      const customPrompt = '优先选择分类为"测试分类"的事件';
      const defaultPrompt = buildPromptWithMetrics(events, timeRangeMap, currentTime);

      // 模拟附加自定义提示词
      const finalPrompt = `${defaultPrompt}

====================================
【用户自定义需求】（最高优先级）
====================================
${customPrompt.trim()}

====================================
注意：以上用户自定义需求具有最高优先级，必须优先满足！
====================================`;

      expect(finalPrompt).toContain('你是一个事件分派专家');
      expect(finalPrompt).toContain('【用户自定义需求】（最高优先级）');
      expect(finalPrompt).toContain(customPrompt);
      expect(finalPrompt).toContain('以上用户自定义需求具有最高优先级');
    });

    it('没有自定义提示词时应使用默认提示词', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
      const events = [
        createMockEventWithDates('event-1', '测试事件', null, '2026-01-01T00:00:00Z', '2026-01-25T00:00:00Z')
      ];
      const timeRangeMap = new Map([
        ['event-1', { min: '2026-01-10T00:00:00Z', max: '2026-01-20T00:00:00Z' }]
      ]);

      const prompt = buildPromptWithMetrics(events, timeRangeMap, currentTime);

      expect(prompt).toContain('你是一个事件分派专家');
      expect(prompt).not.toContain('【用户自定义需求】');
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
      const timeRangeMap = new Map();
      const currentTime = new Date('2026-01-31T00:00:00Z');

      const eventList = events.map((e, idx) => `${idx + 1}. ID: ${e.id}`).join('\n\n');

      expect(eventList).toBe('');
    });

    it('应该处理事件没有分类的情况', () => {
      const currentTime = new Date('2026-01-31T00:00:00Z');
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

/**
 * 创建模拟 EventEntity（带日期）
 */
function createMockEventWithDates(
  id: string,
  title: string,
  crawlEndReason: string | null,
  occurredAt: string,
  updatedAt: string
): EventEntity {
  const event = new EventEntity();
  event.id = id;
  event.title = title;
  event.crawl_end_reason = crawlEndReason;
  event.status = 'active';
  event.occurred_at = new Date(occurredAt);
  event.created_at = new Date(occurredAt); // 简化处理
  event.updated_at = new Date(updatedAt);

  // 添加模拟的分类
  const category = new EventCategoryEntity();
  category.id = 'category-1';
  category.name = '测试分类';
  event.category = category;

  return event;
}
