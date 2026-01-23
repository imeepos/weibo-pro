import { useState, useEffect } from 'react';
import { SentimentController } from '@sker/sdk';
import { root } from '@sker/core';
import type { SentimentPolarization, TimeRange } from '@sker/entities';

interface UseSentimentPolarizationResult {
  data: SentimentPolarization | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取情感极化指数数据的 Hook
 *
 * @param timeRange 时间范围，默认 '12h'
 * @returns 情感极化数据、加载状态、错误信息和重新获取函数
 */
export function useSentimentPolarization(
  timeRange: TimeRange = '12h',
  refreshInterval?: number
): UseSentimentPolarizationResult {
  const [data, setData] = useState<SentimentPolarization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const controller = root.get(SentimentController);
      const result = await controller.getPolarization(timeRange);

      setData(result);
    } catch (err) {
      console.error('获取情感极化数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 如果设置了刷新间隔，则定时刷新
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [timeRange, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
