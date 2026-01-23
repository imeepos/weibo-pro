import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { PostingTimeController } from '@sker/sdk';
import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';

export interface PostingTimeHeatmapState {
  data: PostingTimeHeatmapType | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 发帖时间热力图数据 Hook
 * @param eventId 事件ID
 * @returns 发帖时间热力图数据和状态
 */
export const usePostingTimeHeatmap = (eventId: string): PostingTimeHeatmapState => {
  const [state, setState] = useState<PostingTimeHeatmapState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(PostingTimeController);
        const data = await controller.getHeatmap(eventId);

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
