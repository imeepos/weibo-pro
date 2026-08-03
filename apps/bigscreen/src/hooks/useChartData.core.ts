/**
 * 图表数据获取核心逻辑
 * 提供通用的数据获取、缓存、重试 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@sker/core';

// 通用数据状态类型
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isRefreshing: boolean; // 区分首次加载和后台刷新
}

export const logger = createLogger('useChartData');

// 通用的数据获取Hook
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = [],
  options: {
    immediate?: boolean;
    cacheTime?: number;
    retryCount?: number;
  } = {}
): DataState<T> & { refetch: () => Promise<void>; isStale: boolean } {
  const {
    immediate = true,
    cacheTime = 5 * 60 * 1000, // 5分钟缓存
    retryCount = 3,
  } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isRefreshing: false,
  });

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  // 重试定时器引用：卸载/重新拉取时清除，防止卸载后继续重试链并对已卸载组件 setState
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchFnRef = useRef(fetchFn);

  // 每次更新 fetchFn ref，避免闭包陷阱
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // 检查数据是否过期
  const isStale = state.lastUpdated
    ? Date.now() - state.lastUpdated > cacheTime
    : true;

  const fetchData = useCallback(async (isBackgroundRefresh = false): Promise<void> => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 取消未执行的重试定时器
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    // 如果是后台刷新且已有数据，只设置 isRefreshing
    setState(prev => {
      const hasData = prev.data !== null;
      if (isBackgroundRefresh && hasData) {
        return { ...prev, isRefreshing: true, error: null };
      }
      return { ...prev, loading: true, error: null, isRefreshing: false };
    });

    try {
      const data = await fetchFnRef.current();

      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        isRefreshing: false,
      });

      retryCountRef.current = 0;
    } catch (error: any) {
      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error.message || '数据获取失败';

      // 重试逻辑
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        logger.warn(`数据获取失败，正在重试... (${retryCountRef.current}/${retryCount})`, error);

        // 延迟重试
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          fetchData(isBackgroundRefresh);
        }, Math.pow(2, retryCountRef.current) * 1000);

        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isRefreshing: false,
      }));
    }

  }, [...dependencies]);

  // 手动刷新数据（后台刷新模式）
  const refetch = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await fetchData(true); // 后台刷新，保留旧数据
  }, [fetchData]);

  // 自动获取数据
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    // 清理函数
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  return {
    ...state,
    refetch,
    isStale,
  };
}
