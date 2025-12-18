import { useState, useEffect } from 'react';

export interface UseAsyncDataOptions<T> {
  fetcher: () => Promise<T>;
  deps?: React.DependencyList;
}

export interface UseAsyncDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAsyncData<T>(
  options: UseAsyncDataOptions<T>
): UseAsyncDataReturn<T> {
  const { fetcher, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: load };
}
