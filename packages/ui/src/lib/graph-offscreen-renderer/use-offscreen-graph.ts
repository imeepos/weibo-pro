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
  const setLODStats = useGraphStore((state) => state.setLODStats);

  // 相机控制状态
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ theta: 0, phi: Math.PI / 4 });
  const cameraDistance = useRef(500);

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

        case 'LOD_STATS':
          setLODStats(message.stats);
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
    const isDark = document.documentElement.classList.contains('dark');
    const config: RendererConfig = {
      width: rect.width || canvas.width,
      height: rect.height || canvas.height,
      maxNodes: options.maxNodes,
      maxEdges: options.maxEdges,
      pixelRatio: window.devicePixelRatio,
      antialias: false,
      backgroundColor: isDark ? 0x0a0a0f : 0xf9fafb,
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

  /**
   * 更新相机位置（基于球坐标）
   */
  const updateCameraPosition = useCallback(() => {
    const { theta, phi } = cameraRotation.current;
    const distance = cameraDistance.current;

    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.cos(phi);
    const z = distance * Math.sin(phi) * Math.sin(theta);

    setCamera([x, y, z], [0, 0, 0]);
  }, [setCamera]);

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: event.clientX, y: event.clientY };
  }, []);

  /**
   * 鼠标移动事件
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;

    const deltaX = event.clientX - lastMousePos.current.x;
    const deltaY = event.clientY - lastMousePos.current.y;

    // 更新旋转角度
    cameraRotation.current.theta -= deltaX * 0.005;
    cameraRotation.current.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, cameraRotation.current.phi - deltaY * 0.005)
    );

    lastMousePos.current = { x: event.clientX, y: event.clientY };
    updateCameraPosition();
  }, [updateCameraPosition]);

  /**
   * 鼠标松开事件
   */
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  /**
   * 鼠标滚轮事件（直接附加到 DOM 以支持 preventDefault）
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      // 缩放相机距离
      const delta = event.deltaY * 0.5;
      cameraDistance.current = Math.max(100, Math.min(2000, cameraDistance.current + delta));

      updateCameraPosition();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [updateCameraPosition]);

  return {
    workerRef,
    handleClick,
    setCamera,
    setNodeCount,
    // 相机控制事件
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
