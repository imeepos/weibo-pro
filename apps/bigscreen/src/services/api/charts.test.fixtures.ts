import { vi } from 'vitest';

/**
 * 创建 ChartsController 的 mock 实例
 * 供 ChartsAPI 单元测试使用
 */
export function createMockChartsController(): Record<string, any> {
  return {
    getAgeDistribution: vi.fn().mockResolvedValue({
      categories: ['18-25', '26-35'],
      series: [{ name: '年龄分布', data: [450, 680] }],
    }),
    getGenderDistribution: vi.fn().mockResolvedValue({
      categories: ['male', 'female'],
      series: [
        { name: '男', data: [520] },
        { name: '女', data: [480] },
      ],
    }),
    getSentimentTrend: vi.fn().mockResolvedValue({
      categories: ['2024-01-01', '2024-01-02'],
      series: [
        { name: '正面', data: [60, 65] },
        { name: '负面', data: [20, 18] },
        { name: '中性', data: [20, 17] },
      ],
    }),
    getGeographic: vi.fn().mockResolvedValue({
      categories: ['北京', '上海'],
      series: [
        { name: '北京', data: [500] },
        { name: '上海', data: [450] },
      ],
    }),
    getEventTypes: vi.fn().mockResolvedValue({
      categories: ['Politics', 'Entertainment', 'Sports'],
      series: [{ name: '事件类型', data: [150, 200, 100] }],
    }),
    getWordCloud: vi.fn().mockResolvedValue([
      { text: 'keyword1', value: 100 },
      { text: 'keyword2', value: 80 },
    ]),
    getEventCountSeries: vi.fn().mockResolvedValue({
      categories: ['2024-01-01', '2024-01-02'],
      series: [{ name: '事件计数', data: [10, 15] }],
    }),
    getPostCountSeries: vi.fn().mockResolvedValue({
      categories: ['00:00', '01:00'],
      series: [{ name: '帖子计数', data: [50, 45] }],
    }),
    getSentimentData: vi.fn().mockResolvedValue({
      positive: 60,
      negative: 20,
      neutral: 20,
      total: 100,
    }),
    getBatchCharts: vi.fn().mockResolvedValue({
      ageDistribution: [],
      genderDistribution: [],
      sentimentTrend: [],
    }),
  };
}

export type MockChartsController = ReturnType<typeof createMockChartsController>;
