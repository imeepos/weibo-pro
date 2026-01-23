import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { CommunityEvolutionController } from '@sker/sdk';
import type { CommunityEvolutionAnalysis } from '@sker/sdk';

export interface CommunityEvolutionState {
  data: CommunityEvolutionAnalysis | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 社区演化追踪分析数据 Hook
 * @param eventId 事件ID
 * @returns 社区演化分析数据和状态
 */
export const useCommunityEvolution = (eventId: string): CommunityEvolutionState => {
  const [state, setState] = useState<CommunityEvolutionState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(CommunityEvolutionController);
        const data = await controller.getAnalysis(eventId);

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
