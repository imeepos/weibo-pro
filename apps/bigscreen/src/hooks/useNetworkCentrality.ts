import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { NetworkCentralityController } from '@sker/sdk';
import type { CentralityAnalysis } from '@sker/sdk';

export interface NetworkCentralityState {
  data: CentralityAnalysis | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 网络中心性分析数据 Hook
 * @param eventId 事件ID
 * @returns 网络中心性数据和状态
 */
export const useNetworkCentrality = (eventId: string): NetworkCentralityState => {
  const [state, setState] = useState<NetworkCentralityState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(NetworkCentralityController);
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
