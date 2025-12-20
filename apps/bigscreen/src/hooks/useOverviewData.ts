/**
 * 概览数据获取Hook
 * 封装统计数据和情感数据的获取逻辑，提供缓存、重试、错误处理
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createLogger, root } from '@sker/core';
import { OverviewController, type OverviewStatisticsData, type OverviewSentiment } from '@sker/sdk';
import { useAppStore } from '@/stores/useAppStore';

const logger = createLogger('useOverviewData');

const CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存
const RETRY_COUNT = 3;

interface OverviewDataState {
  statsData: OverviewStatisticsData | null;
  sentimentData: OverviewSentiment | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/**
 * 概览数据Hook
 *
 * @returns {Object} 包含数据、加载状态、错误信息和刷新方法
 */
export const useOverviewData = () => {
  const { selectedTimeRange } = useAppStore();
  const controller = useMemo(() => root.get(OverviewController), []);

  const [state, setState] = useState<OverviewDataState>({
    statsData: null,
    sentimentData: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查数据是否过期
  const isStale = state.lastUpdated
    ? Date.now() - state.lastUpdated > CACHE_TIME
    : true;

  const fetchData = useCallback(async (): Promise<void> => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [statisticsResult, sentimentResult] = await Promise.all([
        controller.getStatistics(selectedTimeRange),
        controller.getSentiment(selectedTimeRange),
      ]);

      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        statsData: statisticsResult || null,
        sentimentData: sentimentResult || null,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });

      retryCountRef.current = 0;
    } catch (error: any) {
      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error.message || '数据获取失败';

      // 重试逻辑
      if (retryCountRef.current < RETRY_COUNT) {
        retryCountRef.current++;
        logger.warn(`数据获取失败，正在重试... (${retryCountRef.current}/${RETRY_COUNT})`, error);

        // 指数退避重试
        setTimeout(() => {
          fetchData();
        }, Math.pow(2, retryCountRef.current) * 1000);

        return;
      }

      logger.error('概览数据加载失败', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [controller, selectedTimeRange]);

  // 手动刷新数据
  const refetch = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await fetchData();
  }, [fetchData]);

  // 自动获取数据（首次加载和时间范围变化时）
  useEffect(() => {
    fetchData();

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // 转换统计数据格式
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
    refetch,
  };
};
