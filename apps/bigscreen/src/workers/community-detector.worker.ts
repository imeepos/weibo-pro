/**
 * 社群检测 Web Worker
 *
 * 将 CPU 密集型的 Louvain 算法移到独立线程，避免阻塞 UI
 *
 * 使用方法：
 * ```typescript
 * const worker = new Worker(new URL('./community-detector.worker.ts', import.meta.url));
 * worker.postMessage({ nodes, edges });
 * worker.onmessage = (e) => {
 *   const { communities, relations } = e.data;
 *   // 处理结果
 * };
 * ```
 */

import { LouvainCommunityDetector } from '@sker/ui/lib/graph-community-detector';
import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';

interface WorkerInput {
  nodes: UserRelationNode[];
  edges: UserRelationEdge[];
}

interface WorkerOutput {
  graphData: {
    nodes: Array<{
      id: string;
      name: string;
      val: number;
      color: string;
      communityId?: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      value: number;
    }>;
  };
  duration: number;
}

self.addEventListener('message', (event: MessageEvent<WorkerInput>) => {
  const { nodes, edges } = event.data;
  const startTime = performance.now();

  try {
    console.log(`[Worker] 社群检测开始: ${nodes.length} 节点, ${edges.length} 边`);

    // 执行 Louvain 社群检测算法
    const detector = new LouvainCommunityDetector(nodes, edges);
    const communities = detector.detectCommunities();

    // 构建节点到社群的映射
    const nodeToCommunity = new Map<string, number>();
    const communityMap = new Map<number, { color: string }>();

    communities.forEach((community) => {
      communityMap.set(community.id, { color: community.color });
      community.nodes.forEach((nodeId) => {
        nodeToCommunity.set(nodeId, community.id);
      });
    });

    // 计算节点度数
    const nodeDegree = new Map<string, number>();
    edges.forEach((edge) => {
      nodeDegree.set(edge.source, (nodeDegree.get(edge.source) || 0) + 1);
      nodeDegree.set(edge.target, (nodeDegree.get(edge.target) || 0) + 1);
    });

    // 构建图数据
    const graphNodes = nodes.map((node) => {
      const communityId = nodeToCommunity.get(node.id);
      const community = communityId !== undefined ? communityMap.get(communityId) : undefined;
      const degree = nodeDegree.get(node.id) || 1;
      return {
        id: node.id,
        name: node.name,
        val: degree,
        color: community?.color || '#888',
        communityId,
      };
    });

    const graphLinks = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      value: edge.weight,
    }));

    const duration = performance.now() - startTime;
    console.log(`[Worker] 社群检测完成: 耗时 ${duration.toFixed(0)}ms, 发现 ${communities.length} 个社群`);

    // 返回结果
    const result: WorkerOutput = {
      graphData: {
        nodes: graphNodes,
        links: graphLinks,
      },
      duration,
    };

    self.postMessage(result);

  } catch (error) {
    console.error('[Worker] 社群检测失败:', error);

    // 返回错误
    self.postMessage({
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 支持 TypeScript 类型检查
export type {};
