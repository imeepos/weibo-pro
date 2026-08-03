/**
 * 测试：EventDispatcherAstVisitor 提示词格式化与选择原则
 *
 * 从 EventDispatcherAstVisitor.test.ts 按主题拆分的测试组：
 * - 提示词格式化：带/不带时间范围数据的事件信息展示
 * - 提示词选择原则：时间差值/更新时间/连续性的选择策略
 */

import { describe, it, expect } from 'vitest';
import {
  formatEventWithMetrics,
  buildPromptWithMetrics,
  createMockEventWithDates,
} from '../test/helpers/event-dispatcher-time-range';

describe('EventDispatcherAstVisitor - 提示词功能测试', () => {
  describe('提示词格式化', () => {
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
});
