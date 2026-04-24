import { useCallback, useEffect, useState } from 'react';
import { PersonaAPI } from '@/services/api/persona';
import type { PersonaListItem } from '@sker/sdk';

interface UsePersonaByWeiboUserResult {
  persona: PersonaListItem | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePersonaByWeiboUser(weiboUserId: string | null): UsePersonaByWeiboUserResult {
  const [persona, setPersona] = useState<PersonaListItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPersona = useCallback(async () => {
    if (!weiboUserId) {
      setPersona(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await PersonaAPI.getPersonaByWeiboUserId(weiboUserId);
      setPersona(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载 Persona 摘要失败'));
    } finally {
      setIsLoading(false);
    }
  }, [weiboUserId]);

  useEffect(() => {
    fetchPersona();
  }, [fetchPersona]);

  return { persona, isLoading, error, refetch: fetchPersona };
}
