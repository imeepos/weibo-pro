import { useCallback, useEffect, useState } from 'react';
import { UsersAPI } from '@/services/api/users';
import type {
  CreateDistillationTaskRequest,
  DistillationTaskSummary,
  ReviewDistillationTaskRequest,
} from '@sker/sdk';

const ACTIVE_DISTILLATION_TASK_STATUSES = new Set(['queued', 'crawling', 'analyzing']);
const DISTILLATION_TASK_POLL_INTERVAL_MS = 3000;

interface UseDistillationTasksParams {
  userId: string | null;
}

interface UseDistillationTasksResult {
  tasks: DistillationTaskSummary[];
  latestTask: DistillationTaskSummary | null;
  activeTask: DistillationTaskSummary | null;
  hasActiveTask: boolean;
  isLoading: boolean;
  isCreatingTask: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTask: (request?: CreateDistillationTaskRequest) => Promise<DistillationTaskSummary | null>;
  reviewTask: (
    taskId: string,
    request: ReviewDistillationTaskRequest,
  ) => Promise<DistillationTaskSummary | null>;
}

export function useDistillationTasks(
  params: UseDistillationTasksParams,
): UseDistillationTasksResult {
  const [tasks, setTasks] = useState<DistillationTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async (options?: { background?: boolean }) => {
    if (!params.userId) {
      setTasks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const background = options?.background ?? false;
    if (!background) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const result = await UsersAPI.getDistillationTasks(params.userId);
      setTasks(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载蒸馏任务失败'));
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [params.userId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const latestTask = tasks[0] ?? null;
  const activeTask =
    tasks.find((task) => ACTIVE_DISTILLATION_TASK_STATUSES.has(task.status)) ?? null;
  const hasActiveTask = activeTask !== null;

  useEffect(() => {
    if (!params.userId || !hasActiveTask) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchTasks({ background: true });
    }, DISTILLATION_TASK_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [params.userId, hasActiveTask, activeTask?.id, activeTask?.status, fetchTasks]);

  const createTask = useCallback(async (request?: CreateDistillationTaskRequest) => {
    if (!params.userId) return null;

    setIsCreatingTask(true);
    setError(null);
    try {
      const created = await UsersAPI.createDistillationTask(params.userId, request);
      setTasks((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      return created;
    } finally {
      setIsCreatingTask(false);
    }
  }, [params.userId]);

  const reviewTask = useCallback(async (
    taskId: string,
    request: ReviewDistillationTaskRequest,
  ) => {
    setError(null);
    const reviewed = await UsersAPI.reviewDistillationTask(taskId, request);
    setTasks((prev) => [reviewed, ...prev.filter((item) => item.id !== reviewed.id)]);
    return reviewed;
  }, []);

  return {
    tasks,
    latestTask,
    activeTask,
    hasActiveTask,
    isLoading,
    isCreatingTask,
    error,
    refetch: () => fetchTasks(),
    createTask,
    reviewTask,
  };
}
