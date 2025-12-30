import { useState, useCallback, useEffect, useRef } from 'react';
import { root } from '@sker/core';
import { UserRelationController } from '@sker/sdk';
import type { UserRelationNetwork, UserRelationType, TimeRange } from '@sker/sdk';

interface UseUserRelationNetworkParams {
  relationType: UserRelationType;
  timeRange: TimeRange;
  minWeight: number;
  limit: number;
}

const CACHE_KEY = 'user_relation_network_cache';

function getCachedData(): UserRelationNetwork | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedData(data: UserRelationNetwork) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useUserRelationNetwork(params: UseUserRelationNetworkParams) {
  const { relationType, timeRange, minWeight, limit } = params;
  const [network, setNetwork] = useState<UserRelationNetwork | null>(() => getCachedData());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = useCallback(async (isBackgroundRefresh = false) => {
    setError(null);

    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else if (!network) {
      setIsLoading(true);
    }

    try {
      const controller = root.get(UserRelationController);
      const data = await controller.getNetwork(
        relationType,
        timeRange,
        minWeight,
        limit
      );
      setNetwork(data);
      setCachedData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(`加载失败: ${message}`);
      console.error('Failed to fetch network:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [relationType, timeRange, minWeight, limit]);

  const refetch = useCallback(async () => {
    await fetchNetwork(true);
  }, [fetchNetwork]);

  useEffect(() => {
    fetchNetwork(!!network);
  }, [fetchNetwork]);

  return { network, isLoading, isRefreshing, error, refetch };
}
