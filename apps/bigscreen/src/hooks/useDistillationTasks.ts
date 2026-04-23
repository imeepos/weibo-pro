import { useCallback, useEffect, useState } from 'react';
import { UsersAPI } from '@/services/api/users';
import type { CreateDistillationTaskRequest, DistillationTaskSummary } from '@sker/sdk';

interface UseDistillationTasksParams {
  userId: string | null;
}

interface UseDistillationTasksResult {
  tasks: DistillationTaskSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTask: (request?: CreateDistillationTaskRequest) => Promise<DistillationTaskSummary | null>;
}

export function useDistillationTasks(
  params: UseDistillationTasksParams,
): UseDistillationTasksResult {
  const [tasks, setTasks] = useState<DistillationTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!params.userId) {
      setTasks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await UsersAPI.getDistillationTasks(params.userId);
      setTasks(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载蒸馏任务失败'));
    } finally {
      setIsLoading(false);
    }
  }, [params.userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (request?: CreateDistillationTaskRequest) => {
    if (!params.userId) return null;

    const created = await UsersAPI.createDistillationTask(params.userId, request);
    setTasks((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    return created;
  }, [params.userId]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask,
  };
}
