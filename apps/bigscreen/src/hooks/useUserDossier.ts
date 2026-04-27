import { useCallback, useEffect, useState } from 'react';
import { UsersAPI } from '@/services/api/users';
import type { UserInvestigationDossier } from '@sker/sdk';

interface UseUserDossierParams {
  userId: string | null;
  eventId?: string;
  windowDays?: number;
}

interface UseUserDossierResult {
  dossier: UserInvestigationDossier | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserDossier(params: UseUserDossierParams): UseUserDossierResult {
  const [dossier, setDossier] = useState<UserInvestigationDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDossier = useCallback(async () => {
    if (!params.userId) {
      setDossier(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await UsersAPI.getUserDossier(params.userId, {
        eventId: params.eventId,
        windowDays: params.windowDays ?? 90,
      });
      setDossier(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载用户 dossier 失败'));
    } finally {
      setIsLoading(false);
    }
  }, [params.eventId, params.userId, params.windowDays]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  return { dossier, isLoading, error, refetch: fetchDossier };
}
