import { useCallback, useEffect, useState } from 'react';
import { UsersAPI } from '@/services/api/users';
import type { UserInvestigationQueueItem, UserInvestigationQueueResponse } from '@sker/sdk';

interface UseInvestigationQueueParams {
  eventId?: string;
  riskLevel?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

interface UseInvestigationQueueResult {
  queue: UserInvestigationQueueItem[];
  response: UserInvestigationQueueResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useInvestigationQueue(
  params: UseInvestigationQueueParams,
): UseInvestigationQueueResult {
  const [response, setResponse] = useState<UserInvestigationQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await UsersAPI.getInvestigationQueue({
        eventId: params.eventId,
        riskLevel: params.riskLevel,
        status: params.status,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载高危队列失败'));
    } finally {
      setIsLoading(false);
    }
  }, [params.eventId, params.page, params.pageSize, params.riskLevel, params.status]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    queue: response?.items ?? [],
    response,
    isLoading,
    error,
    refetch: fetchQueue,
  };
}
