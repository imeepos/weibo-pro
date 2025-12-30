/**
 * Render Worker
 * 在独立线程中运行 Three.js 渲染，避免阻塞主线程
 */

/// <reference lib="webworker" />

import { OffscreenThreeRenderer } from './offscreen-three-renderer';
import type {
  RenderWorkerMessage,
  RenderWorkerResponse,
  RendererConfig,
} from './types';
import type { SharedBuffers } from '../graph-data-stream/types';

declare const self: DedicatedWorkerGlobalScope;

let renderer: OffscreenThreeRenderer | null = null;
let animationFrameId: number | null = null;
let isRunning = false;

/**
 * 消息处理器
 */
self.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT':
        handleInit(message.canvas, message.config);
        break;

      case 'UPDATE_BUFFERS':
        handleUpdateBuffers(message.buffers);
        break;

      case 'UPDATE_NODE_COUNT':
        handleUpdateNodeCount(message.count);
        break;

      case 'UPDATE_EDGE_COUNT':
        // 暂时不处理边
        break;

      case 'UPDATE_VISIBILITY':
        // handleUpdateVisibility(message.visibilityMask);
        break;

      case 'SET_CAMERA':
        handleSetCamera(message.position, message.target);
        break;

      case 'PICK':
        handlePick(message.x, message.y, message.requestId);
        break;

      case 'RESIZE':
        handleResize(message.width, message.height, message.pixelRatio);
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
    } as RenderWorkerResponse);
  }
};

/**
 * 初始化渲染器
 */
function handleInit(canvas: OffscreenCanvas, config: RendererConfig): void {
  console.log('🎨 RenderWorker: 初始化渲染器', config);

  renderer = new OffscreenThreeRenderer(canvas, config);

  // 启动渲染循环
  startRenderLoop();

  self.postMessage({ type: 'READY' } as RenderWorkerResponse);
}

/**
 * 更新共享缓冲区
 */
function handleUpdateBuffers(buffers: SharedBuffers): void {
  if (!renderer) return;
  renderer.setBuffers(buffers);
}

/**
 * 更新节点数量
 */
function handleUpdateNodeCount(count: number): void {
  if (!renderer) return;
  renderer.setNodeCount(count);
}

/**
 * 设置相机
 */
function handleSetCamera(
  position: [number, number, number],
  target: [number, number, number]
): void {
  if (!renderer) return;
  renderer.setCamera(position, target);
}

/**
 * 拾取节点
 */
function handlePick(x: number, y: number, requestId: number): void {
  if (!renderer) {
    self.postMessage({
      type: 'PICK_RESULT',
      requestId,
      nodeId: null,
      nodeIndex: -1,
    } as RenderWorkerResponse);
    return;
  }

  const nodeIndex = renderer.pick(x, y);

  self.postMessage({
    type: 'PICK_RESULT',
    requestId,
    nodeId: nodeIndex >= 0 ? String(nodeIndex) : null,
    nodeIndex,
  } as RenderWorkerResponse);
}

/**
 * 调整大小
 */
function handleResize(width: number, height: number, pixelRatio: number): void {
  if (!renderer) return;
  renderer.resize(width, height, pixelRatio);
}

/**
 * 设置配置
 */
function handleSetConfig(config: any): void {
  if (!renderer) return;
  renderer.setRenderConfig(config);
}

/**
 * 销毁渲染器
 */
function handleDispose(): void {
  stopRenderLoop();
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
}

/**
 * 启动渲染循环
 */
function startRenderLoop(): void {
  if (isRunning) return;
  isRunning = true;

  const render = () => {
    if (!isRunning || !renderer) return;

    const fps = renderer.render();

    // 发送帧渲染完成消息（可选）
    self.postMessage({
      type: 'FRAME_RENDERED',
      fps,
    } as RenderWorkerResponse);

    animationFrameId = requestAnimationFrame(render);
  };

  render();
}

/**
 * 停止渲染循环
 */
function stopRenderLoop(): void {
  isRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
