import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { SentimentTransitionController } from '@sker/sdk';
import type { SentimentTransitionAnalysis } from '@sker/sdk';

interface UseSentimentTransitionResult {
  data: SentimentTransitionAnalysis | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSentimentTransition(eventId: string): UseSentimentTransitionResult {
  const [data, setData] = useState<SentimentTransitionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = root.get(SentimentTransitionController);
      const result = await controller.getAnalysis(eventId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
