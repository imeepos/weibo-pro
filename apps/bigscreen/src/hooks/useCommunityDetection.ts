import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { CommunityDetectionController } from '@sker/sdk';
import type { CommunityAnalysis } from '@sker/sdk';

export interface CommunityDetectionState {
  data: CommunityAnalysis | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 社区发现分析数据 Hook
 * @param eventId 事件ID
 * @returns 社区发现数据和状态
 */
export const useCommunityDetection = (eventId: string): CommunityDetectionState => {
  const [state, setState] = useState<CommunityDetectionState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(CommunityDetectionController);
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
