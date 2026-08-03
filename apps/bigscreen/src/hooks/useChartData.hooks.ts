/**
 * 图表数据获取Hooks - 单一数据源 Hooks
 */

import { ChartsAPI, CommonAPI } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';
import { useAsyncData } from './useChartData.core';

// 年龄分布数据Hook
export function useAgeDistribution() {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getAgeDistribution(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 10 * 60 * 1000 } // 10分钟缓存
  );
}

// 性别分布数据Hook
export function useGenderDistribution() {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getGenderDistribution(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 10 * 60 * 1000 }
  );
}

// 情感趋势数据Hook
export function useSentimentTrend(hours: number = 24) {
  return useAsyncData(
    () => ChartsAPI.getSentimentTrend(hours),
    [hours],
    { cacheTime: 2 * 60 * 1000 } // 2分钟缓存，数据更新较频繁
  );
}

// 地理分布数据Hook
export function useGeographicData() {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getGeographicData(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 15 * 60 * 1000 } // 15分钟缓存
  );
}

// 事件类型数据Hook
export function useEventTypes() {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getEventTypes(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 词云数据Hook
export function useWordCloudData(count: number = 50, sentiment?: 'positive' | 'negative' | 'neutral') {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getWordCloudData(count, selectedTimeRange, sentiment),
    [count, selectedTimeRange, sentiment],
    { cacheTime: 3 * 60 * 1000 }
  );
}

// 事件计数时间序列Hook
export function useEventCountSeries(days: number = 7) {
  return useAsyncData(
    () => ChartsAPI.getEventCountSeries(days),
    [days],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 帖子计数时间序列Hook
export function usePostCountSeries(days: number = 7) {
  return useAsyncData(
    () => ChartsAPI.getPostCountSeries(days),
    [days],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 简单情感分析数据Hook
export function useSentimentData() {
  const { selectedTimeRange } = useAppStore();

  return useAsyncData(
    () => ChartsAPI.getSentimentData(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 批量图表数据Hook
export function useBatchChartData(chartTypes: string[]) {
  return useAsyncData(
    () => ChartsAPI.getBatchChartData(chartTypes),
    [chartTypes.join(',')],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 情感曲线数据Hook
export function useEmotionCurve(points: number = 7) {
  return useAsyncData(
    () => CommonAPI.getEmotionCurve(points),
    [points],
    { cacheTime: 2 * 60 * 1000 } // 2分钟缓存，与 useSentimentTrend 一致
  );
}
