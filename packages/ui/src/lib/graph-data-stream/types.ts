/**
 * 图数据流类型定义
 * 用于流式加载和管理大规模图数据
 */

import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';

/**
 * 共享缓冲区类型
 */
export interface SharedBuffers {
  position: SharedArrayBuffer;    // 节点位置 (x, y, z)
  velocity: SharedArrayBuffer;    // 节点速度 (vx, vy, vz)
  color: SharedArrayBuffer;       // 节点颜色 (r, g, b)
  size: SharedArrayBuffer;        // 节点大小
  edgeIndex: SharedArrayBuffer;   // 边索引 (source, target)
  edgeWeight: SharedArrayBuffer;  // 边权重
}

/**
 * 共享缓冲区视图
 */
export interface SharedBufferViews {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  edgeIndices: Uint32Array;
  edgeWeights: Float32Array;
}

/**
 * 节点数据块
 */
export interface NodeChunk {
  nodes: UserRelationNode[];
  progress: number;      // 已加载节点数
  isComplete: boolean;   // 是否加载完成
}

/**
 * 边数据块
 */
export interface EdgeChunk {
  edges: UserRelationEdge[];
  progress: number;
  isComplete: boolean;
}

/**
 * 二进制节点数据
 */
export interface BinaryNodeData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  metadata: NodeMetadata[];
}

/**
 * 二进制边数据
 */
export interface BinaryEdgeData {
  indices: Uint32Array;
  weights: Float32Array;
}

/**
 * 节点元数据（不放入 TypedArray）
 */
export interface NodeMetadata {
  id: string;
  label: string;
  userType: string;
  [key: string]: any;
}

/**
 * 图数据统计
 */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  maxDegree: number;
  minDegree: number;
  communities: number;
}

/**
 * 数据加载配置
 */
export interface DataLoadConfig {
  chunkSize?: number;        // 分块大小（默认 10000）
  enableStreaming?: boolean; // 启用流式加载（默认 true）
  maxNodes?: number;         // 最大节点数（默认 1000000）
  maxEdges?: number;         // 最大边数（默认 5000000）
}

/**
 * SharedBufferManager 配置
 */
export interface SharedBufferConfig {
  maxNodes: number;
  maxEdges: number;
  useSharedArrayBuffer?: boolean; // 是否使用 SharedArrayBuffer（默认 true，降级为 ArrayBuffer）
}
