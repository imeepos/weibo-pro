import { useState, useCallback, useEffect } from 'react';
import { root, createLogger } from '@sker/core';
import { UsersController } from '@sker/sdk';
import type { UserListResponse, RiskLevelConfig, TimeRange, UserStatistics } from '@sker/sdk';

const logger = createLogger('useUserDetection');

interface UseUserDetectionParams {
  timeRange: TimeRange;
  page?: number;
  pageSize?: number;
}

interface UseUserDetectionReturn {
  users: UserListResponse | null;
  riskLevels: RiskLevelConfig[];
  statistics: UserStatistics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserDetection(params: UseUserDetectionParams): UseUserDetectionReturn {
  const [users, setUsers] = useState<UserListResponse | null>(null);
  const [riskLevels, setRiskLevels] = useState<RiskLevelConfig[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = root.get(UsersController);

      const [usersResult, riskLevelsResult, statisticsResult] = await Promise.all([
        controller.getUserList(params.timeRange, params.page, params.pageSize),
        controller.getRiskLevels(params.timeRange),
        controller.getStatistics(params.timeRange)
      ]);

      setUsers(usersResult);
      setRiskLevels(riskLevelsResult);
      setStatistics(statisticsResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('加载用户数据失败');
      setError(errorMessage);
      logger.error('Failed to fetch user detection data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [params.timeRange, params.page, params.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    users,
    riskLevels,
    statistics,
    isLoading,
    error,
    refetch: fetchData,
  };
}
