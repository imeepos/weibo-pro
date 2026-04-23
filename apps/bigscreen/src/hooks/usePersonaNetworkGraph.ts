import { useCallback, useEffect, useState } from 'react';
import { PersonaAPI } from '@/services/api/persona';
import type { PersonaNetworkGraph } from '@sker/sdk';

interface UsePersonaNetworkGraphResult {
  graph: PersonaNetworkGraph;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const emptyGraph: PersonaNetworkGraph = {
  personas: [],
  edges: [],
};

export function usePersonaNetworkGraph(): UsePersonaNetworkGraphResult {
  const [graph, setGraph] = useState<PersonaNetworkGraph>(emptyGraph);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await PersonaAPI.getGraphOverview();
      setGraph(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载 Persona 图谱失败'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, isLoading, error, refetch: fetchGraph };
}
