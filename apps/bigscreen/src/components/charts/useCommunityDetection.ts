import { useEffect, useState } from 'react';
import type { UserRelationNetwork } from '@sker/sdk';
import {
  LouvainCommunityDetector,
  analyzeInterCommunityRelations,
} from '@sker/ui/lib/graph-community-detector';
import type { CommunityMapping } from './NodeShapeUtils';

export interface CommunityDetectionResult {
  communityMapping: CommunityMapping | null;
  interCommunityRelations: any[];
}

/**
 * 社群检测 Hook：
 * 当启用社群可视化时，使用 Louvain 算法在浏览器空闲时间执行社群检测。
 * 包含性能保护（节点数警告、耗时警告）与错误兜底。
 */
export function useCommunityDetection(
  network: UserRelationNetwork,
  enabled: boolean
): CommunityDetectionResult {
  const [communityMapping, setCommunityMapping] = useState<CommunityMapping | null>(null);
  const [interCommunityRelations, setInterCommunityRelations] = useState<any[]>([]);

  useEffect(() => {
    if (enabled && network.nodes.length > 0 && network.edges.length > 0) {
      // 性能保护：节点数超过 3000 时警告用户
      if (network.nodes.length > 3000) {
        console.warn(`⚠️ 社群检测：节点数量 ${network.nodes.length} 较大，可能影响性能`);
      }

      // 使用 requestIdleCallback 在浏览器空闲时执行（降低优先级）
      const callback = window.requestIdleCallback || ((cb: any) => setTimeout(cb, 0));

      const handle = callback(() => {
        try {
          const startTime = performance.now();
          const detector = new LouvainCommunityDetector(network.nodes, network.edges);
          const communities = detector.detectCommunities();
          const duration = performance.now() - startTime;

          if (duration > 1000) {
            console.warn(`⚠️ 社群检测耗时 ${duration.toFixed(0)}ms，建议减少节点数量`);
          }

          const nodeToCommunity = new Map<string, number>();
          for (const community of communities) {
            for (const nodeId of community.nodes) {
              nodeToCommunity.set(nodeId, community.id);
            }
          }

          const mapping: CommunityMapping = {
            nodeToCommunity,
            communities,
          };

          setCommunityMapping(mapping);

          const relations = analyzeInterCommunityRelations(communities, network.edges);
          setInterCommunityRelations(relations);
        } catch (error) {
          console.warn('❌ 社群检测失败:', error);
          setCommunityMapping(null);
          setInterCommunityRelations([]);
        }
      });

      return () => {
        if ('cancelIdleCallback' in window && typeof handle === 'number') {
          window.cancelIdleCallback(handle);
        }
      };
    } else {
      setCommunityMapping(null);
      setInterCommunityRelations([]);
    }
  }, [network.nodes, network.edges, enabled]);

  return { communityMapping, interCommunityRelations };
}
