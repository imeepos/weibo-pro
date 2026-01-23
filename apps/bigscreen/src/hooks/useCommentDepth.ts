import { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { CommentDepthController } from '@sker/sdk';
import type { CommentDepthAnalysis as CommentDepthAnalysisType } from '@sker/sdk';

export interface CommentDepthState {
  data: CommentDepthAnalysisType | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 评论深度分析数据 Hook
 * @param eventId 事件ID
 * @returns 评论深度分析数据和状态
 */
export const useCommentDepth = (eventId: string): CommentDepthState => {
  const [state, setState] = useState<CommentDepthState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const controller = root.get(CommentDepthController);
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
