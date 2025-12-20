import { useState, useEffect, useCallback, useRef } from 'react';
import { root, createLogger } from '@sker/core';
import { LlmChatLogsController, type LlmChatLogStats } from '@sker/sdk';
import { getDateRangeByTimeRange, type TimeRange } from '@sker/entities';

const logger = createLogger('useLlmStats');

export interface UseLlmStatsResult {
  stats: LlmChatLogStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useLlmStats = (timeRange: TimeRange): UseLlmStatsResult => {
  const [stats, setStats] = useState<LlmChatLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const controller = root.get(LlmChatLogsController);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRangeByTimeRange(timeRange);
      const data = await controller.getStats(start.toISOString(), end.toISOString());

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setStats(data);
      setError(null);
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('获取统计数据失败');
      setError(error);
      logger.error('Failed to load stats', { error, timeRange });
    } finally {
      setLoading(false);
    }
  }, [controller, timeRange]);

  useEffect(() => {
    fetchStats();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};
