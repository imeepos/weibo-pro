/**
 * Layout Worker
 * 在独立线程中运行力导向布局计算
 */

/// <reference lib="webworker" />

import { SimpleForceLayout } from './simple-force-layout';
import type {
  LayoutWorkerMessage,
  LayoutWorkerResponse,
  LayoutConfig,
  SharedBuffers,
  IForceLayout,
} from './types';

declare const self: DedicatedWorkerGlobalScope;

let layout: IForceLayout | null = null;
let isRunning = false;
let animationFrameId: number | null = null;

// SharedBuffer 视图
let positions: Float32Array | null = null;
let velocities: Float32Array | null = null;
let edgeIndices: Uint32Array | null = null;
let edgeWeights: Float32Array | null = null;

let nodeCount = 0;
let edgeCount = 0;

/**
 * 消息处理器
 */
self.onmessage = (event: MessageEvent<LayoutWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT':
        handleInit(message.buffers, message.nodeCount, message.edgeCount, message.config);
        break;

      case 'START':
        handleStart();
        break;

      case 'STOP':
        handleStop();
        break;

      case 'STEP':
        handleStep(message.iterations);
        break;

      case 'SET_CONFIG':
        handleSetConfig(message.config);
        break;

      case 'DISPOSE':
        handleDispose();
        break;

      default:
        console.warn('⚠️ 未知消息类型:', message);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: 'ERROR',
      error: errorMessage,
    } as LayoutWorkerResponse);
  }
};

/**
 * 初始化布局引擎
 */
function handleInit(
  buffers: SharedBuffers,
  nc: number,
  ec: number,
  config: LayoutConfig
): void {
  console.log('🔧 LayoutWorker: 初始化', { nodeCount: nc, edgeCount: ec });

  nodeCount = nc;
  edgeCount = ec;

  // 创建 SharedBuffer 视图
  positions = new Float32Array(buffers.position);
  velocities = new Float32Array(buffers.velocity);
  edgeIndices = new Uint32Array(buffers.edgeIndex);
  edgeWeights = new Float32Array(buffers.edgeWeight);

  // 创建布局引擎（暂时只使用 CPU 版本）
  layout = new SimpleForceLayout();

  // 初始化布局
  layout.init(
    positions,
    velocities,
    edgeIndices,
    edgeWeights,
    nodeCount,
    edgeCount,
    config
  );

  self.postMessage({ type: 'READY' } as LayoutWorkerResponse);
}

/**
 * 启动布局计算
 */
function handleStart(): void {
  if (isRunning) return;

  console.log('▶️ LayoutWorker: 启动布局计算');
  isRunning = true;

  self.postMessage({ type: 'STARTED' } as LayoutWorkerResponse);

  // 启动计算循环
  startComputeLoop();
}

/**
 * 停止布局计算
 */
function handleStop(): void {
  if (!isRunning) return;

  console.log('⏸️ LayoutWorker: 停止布局计算');
  isRunning = false;

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  self.postMessage({ type: 'STOPPED' } as LayoutWorkerResponse);
}

/**
 * 执行指定次数的迭代
 */
function handleStep(iterations: number = 1): void {
  if (!layout) return;

  const state = layout.run(iterations);

  self.postMessage({
    type: 'PROGRESS',
    state,
  } as LayoutWorkerResponse);

  if (state.isConverged) {
    handleStop();
    self.postMessage({
      type: 'CONVERGED',
      state,
    } as LayoutWorkerResponse);
  }
}

/**
 * 设置配置
 */
function handleSetConfig(config: Partial<LayoutConfig>): void {
  // TODO: 实现配置更新
  console.log('⚙️ LayoutWorker: 更新配置', config);
}

/**
 * 销毁布局引擎
 */
function handleDispose(): void {
  handleStop();

  if (layout) {
    layout.dispose();
    layout = null;
  }

  positions = null;
  velocities = null;
  edgeIndices = null;
  edgeWeights = null;
}

/**
 * 启动计算循环
 */
function startComputeLoop(): void {
  const compute = () => {
    if (!isRunning || !layout) return;

    // 执行一步迭代
    const state = layout.step();

    // 每 10 次迭代发送一次进度
    if (state.iteration % 10 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        state,
      } as LayoutWorkerResponse);
    }

    // 检查是否收敛
    if (state.isConverged) {
      handleStop();
      self.postMessage({
        type: 'CONVERGED',
        state,
      } as LayoutWorkerResponse);
      return;
    }

    // 继续下一帧
    animationFrameId = requestAnimationFrame(compute);
  };

  compute();
}
