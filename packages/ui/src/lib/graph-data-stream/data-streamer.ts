/**
 * 数据流加载器
 * 支持流式加载大规模图数据，避免一次性加载导致的内存峰值
 */

import * as THREE from 'three';
import type {
  NodeChunk,
  EdgeChunk,
  BinaryNodeData,
  BinaryEdgeData,
  DataLoadConfig,
  NodeMetadata,
} from './types';
import type { UserRelationNode, UserRelationEdge, UserRelationNetwork } from '@sker/sdk';

const DEFAULT_CONFIG: Required<DataLoadConfig> = {
  chunkSize: 10000,
  enableStreaming: true,
  maxNodes: 1000000,
  maxEdges: 5000000,
};

/**
 * 获取用户类型颜色
 */
function getUserTypeColor(userType: string): string {
  const colorMap: Record<string, string> = {
    kol: '#ff6b6b',      // 红色 - KOL
    media: '#4ecdc4',    // 青色 - 媒体
    gov: '#45b7d1',      // 蓝色 - 政府
    enterprise: '#96ceb4', // 绿色 - 企业
    普通用户: '#ffeaa7', // 黄色 - 普通用户
  };
  return colorMap[userType] || '#95a5a6'; // 灰色 - 未知
}

/**
 * 计算节点大小
 */
function calculateNodeSize(node: UserRelationNode): number {
  const baseSize = 1.0;
  const followerWeight = 0.5;
  const influenceWeight = 0.3;
  const postWeight = 0.2;

  const normalizedFollowers = Math.log10((node.followers || 0) + 1) / 7; // 假设最大 10M 粉丝
  const normalizedInfluence = (node.influence || 0) / 100;
  const normalizedPosts = Math.log10((node.postCount || 0) + 1) / 5; // 假设最大 100k 帖子

  const size =
    baseSize +
    normalizedFollowers * followerWeight +
    normalizedInfluence * influenceWeight +
    normalizedPosts * postWeight;

  return Math.max(0.5, Math.min(3.0, size)); // 限制在 0.5-3.0 之间
}

export class DataStreamer {
  private config: Required<DataLoadConfig>;

  constructor(config: Partial<DataLoadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 从网络数据转换为分块迭代器
   */
  async *fromNetwork(network: UserRelationNetwork): AsyncGenerator<{
    nodeChunk: NodeChunk | null;
    edgeChunk: EdgeChunk | null;
  }> {
    const { nodes, edges } = network;
    const { chunkSize, maxNodes, maxEdges } = this.config;

    // 限制节点数
    const limitedNodes = nodes.slice(0, maxNodes);
    const nodeIdMap = new Map<string, number>();
    limitedNodes.forEach((node, index) => {
      nodeIdMap.set(node.id, index);
    });

    // 分块加载节点
    for (let i = 0; i < limitedNodes.length; i += chunkSize) {
      const chunk = limitedNodes.slice(i, i + chunkSize);
      yield {
        nodeChunk: {
          nodes: chunk,
          progress: Math.min(i + chunk.length, limitedNodes.length),
          isComplete: i + chunk.length >= limitedNodes.length,
        },
        edgeChunk: null,
      };

      // 模拟异步加载（避免阻塞主线程）
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // 过滤有效边（两端节点都存在）
    const validEdges = edges
      .filter((edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))
      .slice(0, maxEdges);

    // 分块加载边
    for (let i = 0; i < validEdges.length; i += chunkSize) {
      const chunk = validEdges.slice(i, i + chunkSize);
      yield {
        nodeChunk: null,
        edgeChunk: {
          edges: chunk,
          progress: Math.min(i + chunk.length, validEdges.length),
          isComplete: i + chunk.length >= validEdges.length,
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * 将节点数据转换为二进制格式（高效传输）
   */
  nodesToBinary(nodes: UserRelationNode[], startIndex: number = 0): BinaryNodeData {
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const sizes = new Float32Array(nodes.length);
    const metadata: NodeMetadata[] = [];

    nodes.forEach((node, i) => {
      const idx = i * 3;

      // 随机初始位置（布局计算会覆盖）
      positions[idx] = (Math.random() - 0.5) * 1000;
      positions[idx + 1] = (Math.random() - 0.5) * 1000;
      positions[idx + 2] = (Math.random() - 0.5) * 1000;

      // 颜色
      const color = new THREE.Color(getUserTypeColor(node.userType));
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;

      // 大小
      sizes[i] = calculateNodeSize(node);

      // 元数据（不放入 TypedArray）
      metadata.push({
        id: node.id,
        label: node.name,
        userType: node.userType,
        followers: node.followers,
        influence: node.influence,
        postCount: node.postCount,
      });
    });

    return { positions, colors, sizes, metadata };
  }

  /**
   * 将边数据转换为二进制格式
   */
  edgesToBinary(
    edges: UserRelationEdge[],
    nodeIdMap: Map<string, number>
  ): BinaryEdgeData {
    const indices = new Uint32Array(edges.length * 2);
    const weights = new Float32Array(edges.length);

    edges.forEach((edge, i) => {
      const sourceIdx = nodeIdMap.get(edge.source);
      const targetIdx = nodeIdMap.get(edge.target);

      if (sourceIdx !== undefined && targetIdx !== undefined) {
        indices[i * 2] = sourceIdx;
        indices[i * 2 + 1] = targetIdx;
        weights[i] = edge.weight || 1.0;
      } else {
        console.warn(`⚠️ 边 ${edge.source} -> ${edge.target} 的节点不存在`);
      }
    });

    return { indices, weights };
  }

  /**
   * 构建节点 ID 映射（ID -> 索引）
   */
  buildNodeIdMap(nodes: UserRelationNode[]): Map<string, number> {
    const map = new Map<string, number>();
    nodes.forEach((node, index) => {
      map.set(node.id, index);
    });
    return map;
  }

  /**
   * 流式加载 URL 数据（JSON Lines 格式）
   */
  async *streamFromURL(url: string): AsyncGenerator<NodeChunk> {
    const response = await fetch(url);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';
    let nodesLoaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 解析完整的 JSON 行
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      const nodes: UserRelationNode[] = [];
      for (const line of lines) {
        if (line.trim()) {
          try {
            nodes.push(JSON.parse(line));
          } catch (e) {
            console.warn('⚠️ JSON 解析失败:', e);
          }
        }
      }

      if (nodes.length > 0) {
        nodesLoaded += nodes.length;
        yield {
          nodes,
          progress: nodesLoaded,
          isComplete: false,
        };
      }
    }

    yield { nodes: [], progress: nodesLoaded, isComplete: true };
  }
}
