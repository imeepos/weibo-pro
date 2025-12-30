import { useRef, useCallback, useState } from 'react';
import { useMemoizedFn } from '@sker/ui/hooks/use-memoized-fn';
import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';
import type { GraphData } from '@sker/ui/components/ui/force-graph-3d';

export const useCommunityDetectorWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detect = useMemoizedFn((nodes: UserRelationNode[], edges: UserRelationEdge[]) => {
    // 性能保护：节点数超过 10000 时拒绝执行
    if (nodes.length > 10000) {
      setError(`节点数量过多 (${nodes.length})，建议 < 10000`);
      return;
    }

    setIsDetecting(true);
    setError(null);

    // 创建 Worker（如果不存在）
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/community-detector.worker.ts', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.onmessage = (event) => {
          const data = event.data;

          if (data.error) {
            setError(data.error);
            setIsDetecting(false);
            return;
          }

          setGraphData(data.graphData);
          setIsDetecting(false);

          console.log(`✅ 社群检测完成 (Worker): 耗时 ${data.duration.toFixed(0)}ms`);
        };

        workerRef.current.onerror = (err) => {
          console.error('❌ Worker 错误:', err);
          setError('Worker 执行失败');
          setIsDetecting(false);
        };

      } catch (err) {
        console.error('❌ Worker 创建失败:', err);
        setError('不支持 Web Worker');
        setIsDetecting(false);
        return;
      }
    }

    // 发送数据到 Worker
    workerRef.current.postMessage({ nodes, edges });
  });

  const reset = useCallback(() => {
    setGraphData(null);
    setError(null);
    setIsDetecting(false);
  }, []);

  // 清理 Worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    reset();
  }, [reset]);

  return {
    detect,
    reset,
    terminate,
    isDetecting,
    graphData,
    error,
  };
};
