import { useState, useCallback, useEffect } from 'react';
import { root } from '@sker/core';
import { UserRelationController } from '@sker/sdk';
import type { UserRelationNetwork, UserRelationType, TimeRange } from '@sker/sdk';

interface UseUserRelationNetworkParams {
  relationType: UserRelationType;
  timeRange: TimeRange;
  minWeight: number;
  limit: number;
}

export function useUserRelationNetwork(params: UseUserRelationNetworkParams) {
  const [network, setNetwork] = useState<UserRelationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = useCallback(async (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh && network) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const controller = root.get(UserRelationController);
      const data = await controller.getNetwork(
        params.relationType,
        params.timeRange,
        params.minWeight,
        params.limit
      );
      setNetwork(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(`加载失败: ${message}`);
      console.error('Failed to fetch network:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.relationType, params.timeRange, params.minWeight, params.limit, network]);

  const refetch = useCallback(async () => {
    await fetchNetwork(true);
  }, [fetchNetwork]);

  useEffect(() => {
    fetchNetwork();
  }, [params.relationType, params.timeRange, params.minWeight, params.limit]);

  return { network, isLoading, isRefreshing, error, refetch };
}
