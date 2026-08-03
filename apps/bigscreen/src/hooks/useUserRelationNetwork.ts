import { useState, useCallback, useEffect } from 'react';
import { root } from '@sker/core';
import { UserRelationController } from '@sker/sdk';
import type { UserRelationNetwork, UserRelationType, TimeRange } from '@sker/sdk';

interface UseUserRelationNetworkParams {
  relationType: UserRelationType;
  timeRange: TimeRange;
  eventId?: string;
  minWeight: number;
  limit: number;
  enabled?: boolean;
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
  } catch {
    // 缓存写入失败不影响功能
  }
}

export function useUserRelationNetwork(params: UseUserRelationNetworkParams) {
  const { relationType, timeRange, eventId, minWeight, limit, enabled = true } = params;
  const [network, setNetwork] = useState<UserRelationNetwork | null>(() => getCachedData());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = useCallback(async (isBackgroundRefresh = false) => {
    if (!enabled) return;

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
        eventId,
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
  }, [enabled, relationType, timeRange, eventId, minWeight, limit]);

  const refetch = useCallback(async () => {
    await fetchNetwork(true);
  }, [fetchNetwork]);

  useEffect(() => {
    if (!enabled) return;
    // 注意：deps 不含 network——请求成功后 setNetwork 会改变 network 引用，
    // 若加入 deps 会导致 effect 每次请求返回后重跑，形成无限请求循环。
    // 只在参数或 enabled 变化时请求一次。
    fetchNetwork(!!network);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchNetwork]);

  return { network, isLoading, isRefreshing, error, refetch };
}
