/**
 * OffscreenCanvas 渲染器类型定义
 */

import type { SharedBuffers } from '../graph-data-stream/types';

/**
 * 渲染器配置
 */
export interface RendererConfig {
  width: number;
  height: number;
  maxNodes: number;
  maxEdges: number;
  pixelRatio?: number;
  antialias?: boolean;
  backgroundColor?: number;
}

/**
 * Worker 消息类型（主线程 -> Worker）
 */
export type RenderWorkerMessage =
  | { type: 'INIT'; canvas: OffscreenCanvas; config: RendererConfig }
  | { type: 'UPDATE_BUFFERS'; buffers: SharedBuffers }
  | { type: 'UPDATE_NODE_COUNT'; count: number }
  | { type: 'UPDATE_EDGE_COUNT'; count: number }
  | { type: 'UPDATE_VISIBILITY'; visibilityMask: Uint8Array }
  | { type: 'UPDATE_LOD'; lodAssignments: Map<number, number>; visibleIndices: Set<number> }
  | { type: 'SET_CAMERA'; position: [number, number, number]; target: [number, number, number] }
  | { type: 'PICK'; x: number; y: number; requestId: number }
  | { type: 'RESIZE'; width: number; height: number; pixelRatio: number }
  | { type: 'SET_CONFIG'; config: Partial<RenderConfig> }
  | { type: 'DISPOSE' };

/**
 * Worker 响应类型（Worker -> 主线程）
 */
export type RenderWorkerResponse =
  | { type: 'READY' }
  | { type: 'FRAME_RENDERED'; fps: number }
  | { type: 'PICK_RESULT'; requestId: number; nodeId: string | null; nodeIndex: number }
  | { type: 'ERROR'; error: string };

/**
 * 渲染配置
 */
export interface RenderConfig {
  enableEdges: boolean;
  enableLabels: boolean;
  enableGlow: boolean;
  edgeOpacity: number;
  nodeOpacity: number;
}

/**
 * 相机配置
 */
export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Node Mesh Pool 配置
 */
export interface NodeMeshPoolConfig {
  maxNodes: number;
  lodLevels?: number;
  instancedRendering?: boolean;
}
