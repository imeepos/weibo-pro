import { useCallback, useEffect, useRef, useState } from 'react';
import type { OverviewRealtimeSnapshot } from '@sker/sdk';
import { OverviewAPI } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';
import { createLogger } from '@sker/core';

const DEFAULT_REFRESH_INTERVAL_MS = 10_000;

const logger = createLogger('useIndexRealtimeSnapshot');

interface SnapshotState {
  data: OverviewRealtimeSnapshot | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  lastUpdated: number | null;
}

export function useIndexRealtimeSnapshot(refreshInterval = DEFAULT_REFRESH_INTERVAL_MS) {
  const selectedTimeRange = useAppStore((state) => state.selectedTimeRange);
  const [state, setState] = useState<SnapshotState>({
    data: null,
    loading: true,
    error: null,
    isRefreshing: false,
    lastUpdated: null,
  });

  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchSnapshot = useCallback(async (background = false) => {
    if (isFetchingRef.current) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    isFetchingRef.current = true;

    setState((prev) => {
      if (background && prev.data) {
        return { ...prev, isRefreshing: true, error: null };
      }
      return { ...prev, loading: true, error: null, isRefreshing: false };
    });

    try {
      const snapshot = await OverviewAPI.getRealtimeSnapshot(selectedTimeRange);

      if (requestId !== requestIdRef.current) return;

      setState({
        data: snapshot,
        loading: false,
        error: null,
        isRefreshing: false,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      const message = error instanceof Error ? error.message : '实时快照加载失败';
      logger.error('Failed to fetch index realtime snapshot', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        isRefreshing: false,
      }));
    } finally {
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    void fetchSnapshot(false);

    const shouldPoll = () => (
      typeof document === 'undefined' || document.visibilityState !== 'hidden'
    );

    const intervalId = window.setInterval(() => {
      if (shouldPoll()) {
        void fetchSnapshot(true);
      }
    }, refreshInterval);

    const handleVisibilityChange = () => {
      if (shouldPoll()) {
        void fetchSnapshot(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSnapshot, refreshInterval]);

  return {
    ...state,
    refetch: () => fetchSnapshot(true),
  };
}
