import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { UserStratificationController } from '@sker/sdk';
import type { UserStratification as UserStratificationType } from '@sker/sdk';

export interface UserStratificationState {
  data: UserStratificationType | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 用户参与度分层数据 Hook
 * @param eventId 事件ID
 * @returns 用户分层数据和状态
 */
export const useUserStratification = (eventId: string): UserStratificationState => {
  const [state, setState] = useState<UserStratificationState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(UserStratificationController);
        const data = await controller.getStratification(eventId);

        if (isMounted) {
          setState({
            data,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return state;
};
