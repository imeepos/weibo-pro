import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { MediaTypeController } from '@sker/sdk';
import type { MediaTypeAnalysis } from '@sker/sdk';

export interface MediaTypeDistributionState {
  data: MediaTypeAnalysis | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 媒体类型分布数据 Hook
 * @param eventId 事件ID
 * @returns 媒体类型分布数据和状态
 */
export const useMediaTypeDistribution = (eventId: string): MediaTypeDistributionState => {
  const [state, setState] = useState<MediaTypeDistributionState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(MediaTypeController);
        const data = await controller.getDistribution(eventId);

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
