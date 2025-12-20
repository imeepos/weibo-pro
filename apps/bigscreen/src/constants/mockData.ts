/**
 * 模拟数据常量
 *
 * 注意：这些是临时的测试数据
 * TODO: 从后端 API 获取真实数据
 */

import type { LocationData } from '@/types';

/**
 * 最大词云词数
 */
export const MAX_WORD_CLOUD_WORDS = 200;

/**
 * 中国主要城市热度分布数据
 * 用于地理热图展示
 */
export const CHINA_CITIES_HEAT_DATA: LocationData[] = [
  {
    coordinates: [116.4074, 39.9042],
    name: '北京',
    sentiment: 'neutral',
    value: 1580
  },
  {
    coordinates: [121.4737, 31.2304],
    name: '上海',
    sentiment: 'positive',
    value: 1420
  },
  {
    coordinates: [113.2644, 23.1291],
    name: '广州',
    sentiment: 'positive',
    value: 980
  },
  {
    coordinates: [114.0579, 22.5431],
    name: '深圳',
    sentiment: 'positive',
    value: 1200
  },
  {
    coordinates: [104.0668, 30.5728],
    name: '成都',
    sentiment: 'neutral',
    value: 850
  },
  {
    coordinates: [120.1551, 30.2741],
    name: '杭州',
    sentiment: 'positive',
    value: 920
  },
  {
    coordinates: [106.5516, 29.563],
    name: '重庆',
    sentiment: 'neutral',
    value: 760
  },
  {
    coordinates: [108.9398, 34.3416],
    name: '西安',
    sentiment: 'neutral',
    value: 680
  },
  {
    coordinates: [114.3055, 30.5931],
    name: '武汉',
    sentiment: 'negative',
    value: 790
  },
  {
    coordinates: [118.7969, 32.0603],
    name: '南京',
    sentiment: 'positive',
    value: 640
  }
];
