/**
 * 图表数据获取Hooks
 * 统一管理图表数据的获取、缓存和状态
 */

import { useCallback, useEffect } from 'react';
import { MAX_WORD_CLOUD_WORDS } from '@/constants/mockData';

export type { DataState } from './useChartData.core';
export { useAsyncData } from './useChartData.core';
import {
  useAgeDistribution,
  useGenderDistribution,
  useSentimentTrend,
  useGeographicData,
  useEventTypes,
  useWordCloudData,
  useEventCountSeries,
  usePostCountSeries,
  useSentimentData,
  useBatchChartData,
  useEmotionCurve,
} from './useChartData.hooks';
export {
  useAgeDistribution,
  useGenderDistribution,
  useSentimentTrend,
  useGeographicData,
  useEventTypes,
  useWordCloudData,
  useEventCountSeries,
  usePostCountSeries,
  useSentimentData,
  useBatchChartData,
  useEmotionCurve,
} from './useChartData.hooks';

// 组合Hook - 获取仪表板所需的所有数据
export function useDashboardData() {
  const ageDistribution = useAgeDistribution();
  const genderDistribution = useGenderDistribution();
  const sentimentTrend = useSentimentTrend();
  const geographic = useGeographicData();
  const eventTypes = useEventTypes();
  const wordCloud = useWordCloudData(MAX_WORD_CLOUD_WORDS);

  // 计算总体加载状态
  const loading = [
    ageDistribution.loading,
    genderDistribution.loading,
    sentimentTrend.loading,
    geographic.loading,
    eventTypes.loading,
    wordCloud.loading,
  ].some(Boolean);

  // 计算错误状态
  const errors = [
    ageDistribution.error,
    genderDistribution.error,
    sentimentTrend.error,
    geographic.error,
    eventTypes.error,
    wordCloud.error,
  ].filter(Boolean);

  // 检查是否有数据过期
  const hasStaleData = [
    ageDistribution.isStale,
    genderDistribution.isStale,
    sentimentTrend.isStale,
    geographic.isStale,
    eventTypes.isStale,
    wordCloud.isStale,
  ].some(Boolean);

  // 刷新所有数据
  const refetchAll = useCallback(async () => {
    await Promise.all([
      ageDistribution.refetch(),
      genderDistribution.refetch(),
      sentimentTrend.refetch(),
      geographic.refetch(),
      eventTypes.refetch(),
      wordCloud.refetch(),
    ]);
  }, [
    ageDistribution.refetch,
    genderDistribution.refetch,
    sentimentTrend.refetch,
    geographic.refetch,
    eventTypes.refetch,
    wordCloud.refetch,
  ]);

  return {
    data: {
      ageDistribution: ageDistribution.data,
      genderDistribution: genderDistribution.data,
      sentimentTrend: sentimentTrend.data,
      geographic: geographic.data,
      eventTypes: eventTypes.data,
      wordCloud: wordCloud.data,
    },
    loading,
    errors,
    hasStaleData,
    refetchAll,
  };
}

// 实时数据更新Hook
export function useRealTimeChartData(
  interval: number = 30000, // 30秒更新一次
  enabled: boolean = true
) {
  const sentimentTrend = useSentimentTrend();
  const eventCountSeries = useEventCountSeries();
  const postCountSeries = usePostCountSeries();

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      // 只刷新实时性要求高的数据
      sentimentTrend.refetch();
      eventCountSeries.refetch();
      postCountSeries.refetch();
    }, interval);

    return () => clearInterval(timer);
  }, [interval, enabled, sentimentTrend.refetch, eventCountSeries.refetch, postCountSeries.refetch]);

  return {
    sentimentTrend: sentimentTrend.data,
    eventCountSeries: eventCountSeries.data,
    postCountSeries: postCountSeries.data,
    loading: sentimentTrend.loading || eventCountSeries.loading || postCountSeries.loading,
    errors: [sentimentTrend.error, eventCountSeries.error, postCountSeries.error].filter(Boolean),
  };
}
