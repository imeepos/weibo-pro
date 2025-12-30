/**
 * GPU 计算模块类型定义
 */

import type { SharedBuffers as SharedBuffersType } from '../graph-data-stream';

// Re-export SharedBuffers so it can be imported from this module
export type { SharedBuffersType as SharedBuffers };

/**
 * 布局算法配置
 */
export interface LayoutConfig {
  // 力导向参数
  repulsionStrength: number;      // 斥力强度（默认 100）
  attractionStrength: number;     // 引力强度（默认 0.1）
  springLength: number;           // 弹簧长度（默认 30）
  damping: number;                // 阻尼系数（默认 0.85）

  // Barnes-Hut 参数
  theta: number;                  // 精度参数（默认 0.5，越小越精确）

  // 迭代参数
  maxIterations: number;          // 最大迭代次数（默认 300）
  minDelta: number;               // 收敛阈值（默认 0.01）
  dt: number;                     // 时间步长（默认 0.016）

  // GPU 参数
  useGPU: boolean;                // 是否使用 GPU（默认 true）
  workgroupSize: number;          // GPU 工作组大小（默认 256）
}

/**
 * 布局状态
 */
export interface LayoutState {
  iteration: number;              // 当前迭代次数
  energy: number;                 // 系统能量
  delta: number;                  // 位置变化量
  isConverged: boolean;           // 是否收敛
  elapsedTime: number;            // 已用时间（ms）
}

/**
 * LayoutWorker 消息类型（主线程 -> Worker）
 */
export type LayoutWorkerMessage =
  | { type: 'INIT'; buffers: SharedBuffersType; nodeCount: number; edgeCount: number; config: LayoutConfig }
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'STEP'; iterations?: number }
  | { type: 'SET_CONFIG'; config: Partial<LayoutConfig> }
  | { type: 'DISPOSE' };

/**
 * LayoutWorker 响应类型（Worker -> 主线程）
 */
export type LayoutWorkerResponse =
  | { type: 'READY' }
  | { type: 'STARTED' }
  | { type: 'STOPPED' }
  | { type: 'PROGRESS'; state: LayoutState }
  | { type: 'CONVERGED'; state: LayoutState }
  | { type: 'ERROR'; error: string };

/**
 * Barnes-Hut 四叉树节点（3D 改为八叉树）
 */
export interface OctreeNode {
  // 边界
  x: number;
  y: number;
  z: number;
  size: number;

  // 质量和质心
  mass: number;
  cx: number;  // 质心 x
  cy: number;  // 质心 y
  cz: number;  // 质心 z

  // 子节点（八叉树有 8 个子节点）
  children: (OctreeNode | null)[];

  // 叶节点数据
  isLeaf: boolean;
  pointIndices: number[];
}

/**
 * 力导向布局引擎接口
 */
export interface IForceLayout {
  /**
   * 初始化布局
   */
  init(
    positions: Float32Array,
    velocities: Float32Array,
    edgeIndices: Uint32Array,
    edgeWeights: Float32Array,
    nodeCount: number,
    edgeCount: number,
    config: LayoutConfig
  ): void;

  /**
   * 执行一步迭代
   */
  step(): LayoutState;

  /**
   * 执行多步迭代
   */
  run(iterations: number): LayoutState;

  /**
   * 销毁
   */
  dispose(): void;
}
