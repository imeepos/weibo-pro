import { useState, useCallback, useEffect } from 'react';
import { root, createLogger } from '@sker/core';
import { UsersController } from '@sker/sdk';
import type { UserListResponse, RiskLevelConfig, TimeRange } from '@sker/sdk';

const logger = createLogger('useUserDetection');

interface UseUserDetectionParams {
  timeRange: TimeRange;
}

interface UseUserDetectionReturn {
  users: UserListResponse | null;
  riskLevels: RiskLevelConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserDetection(params: UseUserDetectionParams): UseUserDetectionReturn {
  const [users, setUsers] = useState<UserListResponse | null>(null);
  const [riskLevels, setRiskLevels] = useState<RiskLevelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = root.get(UsersController);

      const [usersResult, riskLevelsResult] = await Promise.all([
        controller.getUserList(params.timeRange),
        controller.getRiskLevels(params.timeRange)
      ]);

      setUsers(usersResult);
      setRiskLevels(riskLevelsResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('加载用户数据失败');
      setError(errorMessage);
      logger.error('Failed to fetch user detection data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [params.timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    users,
    riskLevels,
    isLoading,
    error,
    refetch: fetchData,
  };
}
