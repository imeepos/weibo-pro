import { useCallback, useEffect, useState } from 'react';
import { PersonaAPI } from '@/services/api/persona';
import type { PersonaMemoryGraph } from '@sker/sdk';

interface UsePersonaMemoryGraphResult {
  graph: PersonaMemoryGraph | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePersonaMemoryGraph(personaId: string | null): UsePersonaMemoryGraphResult {
  const [graph, setGraph] = useState<PersonaMemoryGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!personaId) {
      setGraph(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await PersonaAPI.getMemoryGraph(personaId);
      setGraph(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载 Persona 图谱失败'));
    } finally {
      setIsLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, isLoading, error, refetch: fetchGraph };
}
