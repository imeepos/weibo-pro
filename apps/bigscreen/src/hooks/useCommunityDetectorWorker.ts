/**
 * 社群检测 Web Worker Hook
 *
 * 在独立线程中执行社群检测，避免阻塞主线程
 *
 * @example
 * ```typescript
 * const { detect, isDetecting, communities, relations, error } = useCommunityDetectorWorker();
 *
 * // 触发检测
 * useEffect(() => {
 *   if (enabled && nodes.length > 0 && edges.length > 0) {
 *     detect(nodes, edges);
 *   }
 * }, [nodes, edges, enabled, detect]);
 *
 * // 使用结果
 * if (communities) {
 *   // 渲染社群
 * }
 * ```
 */

import { useRef, useCallback, useState } from 'react';
import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';

interface CommunityMapping {
  nodeToCommunity: Map<string, number>;
  communities: Array<{
    id: number;
    nodes: string[];
    size: number;
    density: number;
    color: string;
  }>;
}

interface InterCommunityRelation {
  sourceCommunity: number;
  targetCommunity: number;
  edgeCount: number;
}

export const useCommunityDetectorWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [communities, setCommunities] = useState<CommunityMapping | null>(null);
  const [relations, setRelations] = useState<InterCommunityRelation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback((nodes: UserRelationNode[], edges: UserRelationEdge[]) => {
    // 性能保护：节点数超过 10000 时拒绝执行
    if (nodes.length > 10000) {
      setError(`节点数量过多 (${nodes.length})，建议 < 10000`);
      return;
    }

    setIsDetecting(true);
    setError(null);

    // 创建 Worker（如果不存在）
    if (!workerRef.current) {
      // 注意：实际使用时需要配置 Vite/Webpack 支持 Worker
      // Vite: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      // Webpack: new Worker(new URL('./worker.ts', import.meta.url))

      try {
        // 这里使用占位符，实际项目中需要根据打包工具调整
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

          // 构建节点到社群的映射
          const nodeToCommunity = new Map<string, number>();
          for (const community of data.communities) {
            for (const nodeId of community.nodes) {
              nodeToCommunity.set(nodeId, community.id);
            }
          }

          setCommunities({
            nodeToCommunity,
            communities: data.communities,
          });
          setRelations(data.relations);
          setIsDetecting(false);

          console.log(`✅ 社群检测完成 (Worker): ${data.communities.length} 个社群, 耗时 ${data.duration.toFixed(0)}ms`);
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

  }, []);

  const reset = useCallback(() => {
    setCommunities(null);
    setRelations([]);
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
    communities,
    relations,
    error,
  };
};
