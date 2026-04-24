import { useCallback, useEffect, useState } from 'react';
import { PersonaAPI } from '@/services/api/persona';
import type { PersonaEvidenceItem } from '@sker/sdk';

interface UsePersonaEvidenceResult {
  evidence: PersonaEvidenceItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePersonaEvidence(personaId: string | null): UsePersonaEvidenceResult {
  const [evidence, setEvidence] = useState<PersonaEvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvidence = useCallback(async () => {
    if (!personaId) {
      setEvidence([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await PersonaAPI.getPersonaEvidence(personaId);
      setEvidence(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载 Persona 证据失败'));
    } finally {
      setIsLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  return { evidence, isLoading, error, refetch: fetchEvidence };
}
