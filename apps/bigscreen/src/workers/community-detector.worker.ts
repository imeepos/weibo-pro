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

import { LouvainCommunityDetector, analyzeInterCommunityRelations } from '@sker/ui/lib/graph-community-detector';
import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';

interface WorkerInput {
  nodes: UserRelationNode[];
  edges: UserRelationEdge[];
}

interface WorkerOutput {
  communities: Array<{
    id: number;
    nodes: string[];
    size: number;
    density: number;
    color: string;
  }>;
  relations: Array<{
    sourceCommunity: number;
    targetCommunity: number;
    edgeCount: number;
  }>;
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

    // 分析社群间关系
    const relations = analyzeInterCommunityRelations(communities, edges);

    const duration = performance.now() - startTime;
    console.log(`[Worker] 社群检测完成: 耗时 ${duration.toFixed(0)}ms, 发现 ${communities.length} 个社群`);

    // 返回结果
    const result: WorkerOutput = {
      communities,
      relations,
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
