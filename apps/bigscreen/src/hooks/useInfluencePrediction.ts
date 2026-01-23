import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { InfluencePredictionController } from '@sker/sdk';
import type { InfluencePredictionAnalysis } from '@sker/sdk';

interface UseInfluencePredictionResult {
  data: InfluencePredictionAnalysis | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useInfluencePrediction(eventId: string): UseInfluencePredictionResult {
  const [data, setData] = useState<InfluencePredictionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = root.get(InfluencePredictionController);
      const result = await controller.getInfluencePrediction(eventId);
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
