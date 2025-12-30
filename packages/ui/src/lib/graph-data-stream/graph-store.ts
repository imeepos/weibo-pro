/**
 * 图数据状态管理
 * 使用 Zustand 管理图的全局状态
 */

import { create } from 'zustand';
import type { SharedBuffers, GraphStats, NodeMetadata } from './types';

/**
 * LOD 统计信息
 */
export interface LODStats {
  totalNodes: number;
  visibleNodes: number;
  culledNodes: number;
  lodDistribution: Record<number, number>;
}

export interface GraphStoreState {
  // 数据状态
  nodeCount: number;
  edgeCount: number;
  loadProgress: number;
  isLoading: boolean;

  // 共享缓冲区
  sharedBuffers: SharedBuffers | null;

  // 节点元数据（ID -> 索引映射 + 元数据）
  nodeIdMap: Map<string, number>;
  nodeMetadata: NodeMetadata[];

  // 统计信息
  stats: GraphStats | null;

  // 渲染状态
  fps: number;
  memoryUsage: number;

  // LOD 状态
  lodStats: LODStats | null;

  // Actions
  setNodeCount: (count: number) => void;
  setEdgeCount: (count: number) => void;
  setLoadProgress: (progress: number) => void;
  setIsLoading: (loading: boolean) => void;
  setSharedBuffers: (buffers: SharedBuffers) => void;
  setNodeIdMap: (map: Map<string, number>) => void;
  setNodeMetadata: (metadata: NodeMetadata[]) => void;
  setStats: (stats: GraphStats) => void;
  setFPS: (fps: number) => void;
  setMemoryUsage: (usage: number) => void;
  setLODStats: (stats: LODStats) => void;
  reset: () => void;
}

const initialState = {
  nodeCount: 0,
  edgeCount: 0,
  loadProgress: 0,
  isLoading: false,
  sharedBuffers: null,
  nodeIdMap: new Map<string, number>(),
  nodeMetadata: [],
  stats: null,
  fps: 0,
  memoryUsage: 0,
  lodStats: null,
};

export const useGraphStore = create<GraphStoreState>((set) => ({
  ...initialState,

  setNodeCount: (count) => set({ nodeCount: count }),
  setEdgeCount: (count) => set({ edgeCount: count }),
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSharedBuffers: (buffers) => set({ sharedBuffers: buffers }),
  setNodeIdMap: (map) => set({ nodeIdMap: map }),
  setNodeMetadata: (metadata) => set({ nodeMetadata: metadata }),
  setStats: (stats) => set({ stats: stats }),
  setFPS: (fps) => set({ fps: fps }),
  setMemoryUsage: (usage) => set({ memoryUsage: usage }),
  setLODStats: (stats) => set({ lodStats: stats }),
  reset: () => set(initialState),
}));

/**
 * 选择器：根据索引获取节点元数据
 */
export const selectNodeById = (state: GraphStoreState, id: string): NodeMetadata | null => {
  const index = state.nodeIdMap.get(id);
  if (index === undefined) return null;
  return state.nodeMetadata[index] || null;
};

/**
 * 选择器：根据索引获取节点元数据
 */
export const selectNodeByIndex = (
  state: GraphStoreState,
  index: number
): NodeMetadata | null => {
  return state.nodeMetadata[index] || null;
};
