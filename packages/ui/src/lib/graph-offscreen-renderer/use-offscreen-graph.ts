/**
 * useOffscreenGraph Hook
 * 封装 OffscreenCanvas 渲染器的 React Hook
 */

import { useEffect, useRef, useCallback, RefObject } from 'react';
import type {
  RenderWorkerMessage,
  RenderWorkerResponse,
  RendererConfig,
} from './types';
import type { SharedBuffers } from '../graph-data-stream/types';
import { useGraphStore } from '../graph-data-stream';

export interface UseOffscreenGraphOptions {
  maxNodes: number;
  maxEdges: number;
  onReady?: () => void;
  onError?: (error: string) => void;
  onNodeClick?: (nodeIndex: number) => void;
}

export function useOffscreenGraph(
  canvasRef: RefObject<HTMLCanvasElement>,
  sharedBuffers: SharedBuffers | null,
  options: UseOffscreenGraphOptions
) {
  const workerRef = useRef<Worker | null>(null);
  const setFPS = useGraphStore((state) => state.setFPS);

  /**
   * 初始化 Worker
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建 OffscreenCanvas 并转移控制权
    const offscreen = (canvas as any).transferControlToOffscreen();

    // 创建 Worker
    const worker = new Worker(
      new URL('./render-worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    // 监听 Worker 消息
    worker.onmessage = (event: MessageEvent<RenderWorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'READY':
          console.log('✅ RenderWorker 已就绪');
          options.onReady?.();
          break;

        case 'FRAME_RENDERED':
          setFPS(message.fps);
          break;

        case 'PICK_RESULT':
          if (message.nodeIndex >= 0) {
            options.onNodeClick?.(message.nodeIndex);
          }
          break;

        case 'ERROR':
          console.error('❌ RenderWorker 错误:', message.error);
          options.onError?.(message.error);
          break;
      }
    };

    // 发送初始化消息
    const rect = canvas.getBoundingClientRect();
    const config: RendererConfig = {
      width: rect.width || canvas.width,
      height: rect.height || canvas.height,
      maxNodes: options.maxNodes,
      maxEdges: options.maxEdges,
      pixelRatio: window.devicePixelRatio,
      antialias: false,
      backgroundColor: 0x000000,
    };

    worker.postMessage(
      {
        type: 'INIT',
        canvas: offscreen,
        config,
      } as RenderWorkerMessage,
      [offscreen] // Transfer ownership
    );

    // 清理
    return () => {
      worker.postMessage({ type: 'DISPOSE' } as RenderWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [canvasRef, options.maxNodes, options.maxEdges]);

  /**
   * 更新共享缓冲区
   */
  useEffect(() => {
    if (!workerRef.current || !sharedBuffers) return;

    workerRef.current.postMessage({
      type: 'UPDATE_BUFFERS',
      buffers: sharedBuffers,
    } as RenderWorkerMessage);
  }, [sharedBuffers]);

  /**
   * 响应窗口大小变化
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !workerRef.current) return;

      const { width, height } = entry.contentRect;

      workerRef.current.postMessage({
        type: 'RESIZE',
        width,
        height,
        pixelRatio: window.devicePixelRatio,
      } as RenderWorkerMessage);
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef]);

  /**
   * 点击事件处理
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !workerRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const requestId = Date.now();

      workerRef.current.postMessage({
        type: 'PICK',
        x,
        y,
        requestId,
      } as RenderWorkerMessage);
    },
    [canvasRef]
  );

  /**
   * 设置相机位置
   */
  const setCamera = useCallback(
    (position: [number, number, number], target: [number, number, number] = [0, 0, 0]) => {
      if (!workerRef.current) return;

      workerRef.current.postMessage({
        type: 'SET_CAMERA',
        position,
        target,
      } as RenderWorkerMessage);
    },
    []
  );

  /**
   * 更新节点数量
   */
  const setNodeCount = useCallback((count: number) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'UPDATE_NODE_COUNT',
      count,
    } as RenderWorkerMessage);
  }, []);

  return {
    workerRef,
    handleClick,
    setCamera,
    setNodeCount,
  };
}
