/**
 * useGraphLayout Hook
 * 管理布局计算 Worker
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type {
  LayoutWorkerMessage,
  LayoutWorkerResponse,
  LayoutConfig,
  LayoutState,
  SharedBuffers,
} from './types';

export interface UseGraphLayoutOptions {
  buffers: SharedBuffers | null;
  nodeCount: number;
  edgeCount: number;
  config?: Partial<LayoutConfig>;
  autoStart?: boolean;
  onProgress?: (state: LayoutState) => void;
  onConverged?: (state: LayoutState) => void;
  onError?: (error: string) => void;
}

const DEFAULT_CONFIG: LayoutConfig = {
  repulsionStrength: 100,
  attractionStrength: 0.1,
  springLength: 30,
  damping: 0.85,
  theta: 0.5,
  maxIterations: 300,
  minDelta: 0.01,
  dt: 0.016,
  useGPU: false,
  workgroupSize: 256,
};

export function useGraphLayout(options: UseGraphLayoutOptions) {
  const workerRef = useRef<Worker | null>(null);
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null);

  const config: LayoutConfig = { ...DEFAULT_CONFIG, ...options.config };

  /**
   * 初始化 Worker
   */
  useEffect(() => {
    if (!options.buffers || options.nodeCount === 0) return;

    // 创建 Worker
    const worker = new Worker(
      new URL('./layout-worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    // 监听 Worker 消息
    worker.onmessage = (event: MessageEvent<LayoutWorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'READY':
          console.log('✅ LayoutWorker 已就绪');
          if (options.autoStart) {
            startLayout();
          }
          break;

        case 'STARTED':
          setIsLayouting(true);
          break;

        case 'STOPPED':
          setIsLayouting(false);
          break;

        case 'PROGRESS':
          setLayoutState(message.state);
          options.onProgress?.(message.state);
          break;

        case 'CONVERGED':
          setLayoutState(message.state);
          setIsLayouting(false);
          options.onConverged?.(message.state);
          console.log('✅ 布局收敛', message.state);
          break;

        case 'ERROR':
          console.error('❌ LayoutWorker 错误:', message.error);
          setIsLayouting(false);
          options.onError?.(message.error);
          break;
      }
    };

    // 发送初始化消息
    worker.postMessage({
      type: 'INIT',
      buffers: options.buffers,
      nodeCount: options.nodeCount,
      edgeCount: options.edgeCount,
      config,
    } as LayoutWorkerMessage);

    // 清理
    return () => {
      worker.postMessage({ type: 'DISPOSE' } as LayoutWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [options.buffers, options.nodeCount, options.edgeCount]);

  /**
   * 启动布局计算
   */
  const startLayout = useCallback(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'START',
    } as LayoutWorkerMessage);
  }, []);

  /**
   * 停止布局计算
   */
  const stopLayout = useCallback(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'STOP',
    } as LayoutWorkerMessage);
  }, []);

  /**
   * 执行指定次数的迭代
   */
  const stepLayout = useCallback((iterations: number = 1) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'STEP',
      iterations,
    } as LayoutWorkerMessage);
  }, []);

  /**
   * 设置社群信息
   */
  const setCommunities = useCallback((nodeCommunities: Map<number, number>) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'SET_COMMUNITIES',
      nodeCommunities: Array.from(nodeCommunities.entries()),
    } as LayoutWorkerMessage);
  }, []);

  return {
    workerRef,
    isLayouting,
    layoutState,
    startLayout,
    stopLayout,
    stepLayout,
    setCommunities,
  };
}
