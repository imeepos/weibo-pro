import { useState, useEffect, useCallback, useRef } from 'react';
import { root, createLogger } from '@sker/core';
import { LlmChatLogsController, type LlmChatLogItem } from '@sker/sdk';
import { getDateRangeByTimeRange, type TimeRange } from '@sker/entities';
import { useDebounce } from './useDebounce';

const logger = createLogger('useLlmLogs');

export interface LogFilters {
  modelName: string;
  providerId: string;
  isSuccess: boolean | undefined;
}

export interface UseLlmLogsResult {
  logs: LlmChatLogItem[];
  loading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setFilters: (filters: LogFilters) => void;
  filters: LogFilters;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 20;

export const useLlmLogs = (timeRange: TimeRange): UseLlmLogsResult => {
  const [logs, setLogs] = useState<LlmChatLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<LogFilters>({
    modelName: '',
    providerId: '',
    isSuccess: undefined,
  });

  const controller = root.get(LlmChatLogsController);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedFilters = useDebounce(filters, 1000);

  const fetchLogs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRangeByTimeRange(timeRange);
      const result = await controller.list(
        start.toISOString(),
        end.toISOString(),
        debouncedFilters.modelName,
        debouncedFilters.providerId,
        debouncedFilters.isSuccess === undefined
          ? undefined
          : debouncedFilters.isSuccess
            ? '1'
            : '0',
        String(currentPage),
        String(DEFAULT_PAGE_SIZE)
      );

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setLogs(result.items);
      setTotalPages(Math.ceil(result.total / DEFAULT_PAGE_SIZE));
      setError(null);
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('获取日志列表失败');
      setError(error);
      logger.error('Failed to load logs', { error, timeRange, filters: debouncedFilters, currentPage });
    } finally {
      setLoading(false);
    }
  }, [controller, timeRange, debouncedFilters, currentPage]);

  useEffect(() => {
    fetchLogs();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  return {
    logs,
    loading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    setFilters,
    filters,
    refetch: fetchLogs,
  };
};
