import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createLogger, root } from '@sker/core';
import { OverviewController, type OverviewStatisticsData, type OverviewSentiment } from '@sker/sdk';
import { useAppStore } from '@/stores/useAppStore';

const logger = createLogger('useOverviewData');

const CACHE_TIME = 5 * 60 * 1000;
const RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY = 1000;
const RETRY_DELAY_MULTIPLIER = 2;

interface OverviewDataState {
  statsData: OverviewStatisticsData | null;
  sentimentData: OverviewSentiment | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isRefreshing: boolean; // 后台刷新状态
}

export const useOverviewData = () => {
  const { selectedTimeRange } = useAppStore();
  const controller = useMemo(() => root.get(OverviewController), []);

  const [state, setState] = useState<OverviewDataState>({
    statsData: null,
    sentimentData: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isRefreshing: false,
  });

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isStale = state.lastUpdated
    ? Date.now() - state.lastUpdated > CACHE_TIME
    : true;

  const fetchData = useCallback(async (isBackgroundRefresh = false): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // 如果是后台刷新且已有数据，只设置 isRefreshing
    setState(prev => {
      const hasData = prev.statsData !== null || prev.sentimentData !== null;
      if (isBackgroundRefresh && hasData) {
        return { ...prev, isRefreshing: true, error: null };
      }
      return { ...prev, loading: true, error: null, isRefreshing: false };
    });

    try {
      const [statisticsResult, sentimentResult] = await Promise.all([
        controller.getStatistics(selectedTimeRange),
        controller.getSentiment(selectedTimeRange),
      ]);

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        statsData: statisticsResult || null,
        sentimentData: sentimentResult || null,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        isRefreshing: false,
      });

      retryCountRef.current = 0;
    } catch (error: any) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error.message || '数据获取失败';

      if (retryCountRef.current < RETRY_COUNT) {
        retryCountRef.current++;
        logger.warn(`数据获取失败，正在重试... (${retryCountRef.current}/${RETRY_COUNT})`, error);

        setTimeout(() => {
          fetchData(isBackgroundRefresh);
        }, INITIAL_RETRY_DELAY * Math.pow(RETRY_DELAY_MULTIPLIER, retryCountRef.current));

        return;
      }

      logger.error('概览数据加载失败', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isRefreshing: false,
      }));
    }
  }, [controller, selectedTimeRange]);

  const refetch = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await fetchData(true); // 后台刷新，保留旧数据
  }, [fetchData]);

  useEffect(() => {
    const hasData = state.statsData !== null || state.sentimentData !== null;
    fetchData(hasData);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedTimeRange]);

  const statsOverviewData = useMemo(() => {
    if (!state.statsData) return null;

    return {
      events: {
        value: state.statsData.eventCount,
        change: state.statsData.eventCountChange
      },
      posts: {
        value: state.statsData.postCount,
        change: state.statsData.postCountChange
      },
      users: {
        value: state.statsData.userCount,
        change: state.statsData.userCountChange
      },
      interactions: {
        value: state.statsData.interactionCount,
        change: state.statsData.interactionCountChange,
      },
    };
  }, [state.statsData]);

  return {
    statsData: state.statsData,
    sentimentData: state.sentimentData,
    statsOverviewData,
    loading: state.loading,
    error: state.error,
    isStale,
    isRefreshing: state.isRefreshing,
    refetch,
  };
};
