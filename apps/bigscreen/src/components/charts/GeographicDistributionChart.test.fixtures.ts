import type { GeographicDataItem } from './GeographicDistributionChart';

// 测试数据 - 按用户数降序排列
export const mockData: GeographicDataItem[] = [
  {
    region: '上海',
    count: 1000,
    percentage: 40.0,
    posts: 500,
    sentiment: 0.65
  },
  {
    region: '广东',
    count: 800,
    percentage: 32.0,
    posts: 400,
    sentiment: 0.60
  },
  {
    region: '重庆',
    count: 600,
    percentage: 24.0,
    posts: 300,
    sentiment: 0.55
  },
  {
    region: '未知地区',
    count: 100,
    percentage: 4.0,
    posts: 50,
    sentiment: 0.50
  }
];
