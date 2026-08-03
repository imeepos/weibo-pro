import { describe, expect, it } from 'vitest';
import type { TrendDataSeries } from '@sker/sdk';
import {
  buildPaginationPages,
  calcChange,
  computeStats,
  extractTrendSeries,
  getSentimentConfig,
  getTrendConfig,
} from './utils';

describe('calcChange', () => {
  it('返回 0 当数据少于两个点', () => {
    expect(calcChange([])).toBe(0);
    expect(calcChange([10])).toBe(0);
  });

  it('计算最后两点的变化率，保留一位小数', () => {
    expect(calcChange([100, 110])).toBe(10);
    expect(calcChange([100, 90])).toBe(-10);
    expect(calcChange([100, 105])).toBe(5);
    expect(calcChange([100, 95])).toBe(-5);
  });

  it('当前值为 0 时返回 100，都为 0 时返回 0', () => {
    expect(calcChange([0, 5])).toBe(100);
    expect(calcChange([0, 0])).toBe(0);
  });
});

describe('extractTrendSeries', () => {
  it('trendData 为 null 时返回空系列', () => {
    expect(extractTrendSeries(null)).toEqual({ events: [], posts: [], users: [], hotness: [] });
  });

  it('按系列名提取数据', () => {
    const trendData: TrendDataSeries = {
      categories: ['a', 'b'],
      series: [
        { name: '事件数量', data: [1, 2] },
        { name: '贴子数量', data: [3, 4] },
        { name: '参与用户', data: [5, 6] },
        { name: '热度指数', data: [7, 8] },
      ],
      totals: { totalEvents: 2, totalPosts: 4, totalUsers: 6, avgHotness: 8 },
    };
    expect(extractTrendSeries(trendData)).toEqual({
      events: [1, 2],
      posts: [3, 4],
      users: [5, 6],
      hotness: [7, 8],
    });
  });

  it('缺失的系列回退为空数组', () => {
    const trendData: TrendDataSeries = {
      categories: [],
      series: [{ name: '事件数量', data: [1] }],
      totals: { totalEvents: 1, totalPosts: 0, totalUsers: 0, avgHotness: 0 },
    };
    expect(extractTrendSeries(trendData)).toEqual({
      events: [1],
      posts: [],
      users: [],
      hotness: [],
    });
  });
});

describe('computeStats', () => {
  it('优先使用后端 totals', () => {
    const trendData: TrendDataSeries = {
      categories: [],
      series: [],
      totals: { totalEvents: 100, totalPosts: 200, totalUsers: 50, avgHotness: 80 },
    };
    const stats = computeStats(trendData, { events: [], posts: [], users: [], hotness: [] });
    expect(stats.totalEvents).toBe(100);
    expect(stats.totalPosts).toBe(200);
    expect(stats.totalUsers).toBe(50);
    expect(stats.avgHotness).toBe(80);
    expect(stats.eventChange).toBe(0);
  });

  it('缺少 totals 时回退到趋势最后一点并计算变化率', () => {
    const stats = computeStats(null, {
      events: [10, 20],
      posts: [5, 10],
      users: [2, 4],
      hotness: [50, 60],
    });
    expect(stats.totalEvents).toBe(20);
    expect(stats.totalPosts).toBe(10);
    expect(stats.totalUsers).toBe(4);
    expect(stats.avgHotness).toBe(55); // Math.round((50+60)/2)
    expect(stats.eventChange).toBe(100);
    expect(stats.postChange).toBe(100);
    expect(stats.userChange).toBe(100);
    expect(stats.hotnessChange).toBe(20);
  });
});

describe('getSentimentConfig', () => {
  it('正面占优时返回正面配置', () => {
    const config = getSentimentConfig({ positive: 3, negative: 1, neutral: 1 });
    expect(config.label).toBe('正面');
    expect(config.color).toBe('text-success');
  });

  it('负面占优时返回负面配置', () => {
    const config = getSentimentConfig({ positive: 1, negative: 3, neutral: 1 });
    expect(config.label).toBe('负面');
    expect(config.color).toBe('text-destructive');
  });

  it('默认返回中性配置', () => {
    const config = getSentimentConfig({ positive: 1, negative: 1, neutral: 3 });
    expect(config.label).toBe('中性');
    expect(config.color).toBe('text-muted-foreground');
  });
});

describe('getTrendConfig', () => {
  it('映射 up/down/stable 趋势', () => {
    expect(getTrendConfig('up').color).toBe('text-green-400');
    expect(getTrendConfig('up').bg).toBe('bg-green-400/10');
    expect(getTrendConfig('down').color).toBe('text-red-400');
    expect(getTrendConfig('down').bg).toBe('bg-red-400/10');
    expect(getTrendConfig('stable').color).toBe('text-muted-foreground');
    expect(getTrendConfig('stable').bg).toBe('bg-muted/30');
  });
});

describe('buildPaginationPages', () => {
  it('相隔较远时插入省略号', () => {
    expect(buildPaginationPages(10, 5)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });

  it('相邻较近时构建连续页码', () => {
    expect(buildPaginationPages(3, 2)).toEqual([1, 2, 3]);
  });

  it('当前页在边缘时正确构建', () => {
    expect(buildPaginationPages(5, 1)).toEqual([1, 2, 'ellipsis', 5]);
  });
});
