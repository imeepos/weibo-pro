import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { SpreadBreadthController } from '@sker/sdk';
import type { SpreadBreadthAnalysis } from '@sker/sdk';

export interface SpreadBreadthState {
  data: SpreadBreadthAnalysis | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 传播广度分析数据 Hook
 * @param eventId 事件ID
 * @returns 传播广度数据和状态
 */
export const useSpreadBreadth = (eventId: string): SpreadBreadthState => {
  const [state, setState] = useState<SpreadBreadthState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(SpreadBreadthController);
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
