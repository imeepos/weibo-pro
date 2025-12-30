import { useEffect, useRef, useCallback, useMemo } from 'react';

interface ForceSimulationConfig {
  chargeStrength?: number;
  linkDistance?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  warmupTicks?: number;
  cooldownTicks?: number;
}

interface SimulationNode {
  id: string | number;
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
}

interface SimulationLink {
  source: string | number;
  target: string | number;
  value?: number;
  [key: string]: any;
}

interface UseForceSimulationWorkerProps {
  nodes: SimulationNode[];
  links: SimulationLink[];
  config?: ForceSimulationConfig;
  onTick?: (positions: Float32Array, alpha: number) => void;
  onEnd?: () => void;
  enabled?: boolean;
}

/**
 * Web Worker 力模拟 Hook
 *
 * 将 D3-force 计算移至后台线程，保持主线程响应
 * 使用 Float32Array 传输位置数据，减少序列化开销
 */
export const useForceSimulationWorker = ({
  nodes,
  links,
  config = {},
  onTick,
  onEnd,
  enabled = true,
}: UseForceSimulationWorkerProps) => {
  const workerRef = useRef<Worker | null>(null);
  const isInitializedRef = useRef(false);

  // 创建 Worker
  useEffect(() => {
    if (!enabled) return;

    try {
      // 使用 new URL() 语法支持 Vite/Webpack 5
      workerRef.current = new Worker(
        new URL('../workers/force-simulation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const message = event.data;

        switch (message.type) {
          case 'ready':
            isInitializedRef.current = true;
            break;

          case 'tick':
            if (onTick) {
              const positions = new Float32Array(message.positions);
              onTick(positions, message.alpha);
            }
            break;

          case 'end':
            if (onEnd) {
              onEnd();
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Force simulation worker error:', error);
      };

      return () => {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'stop' });
          workerRef.current.terminate();
          workerRef.current = null;
        }
        isInitializedRef.current = false;
      };
    } catch (error) {
      console.error('Failed to create force simulation worker:', error);
    }
  }, [enabled, onTick, onEnd]);

  // 初始化模拟
  const initSimulation = useCallback(() => {
    if (!workerRef.current || !enabled) return;

    // 准备节点数据（只发送必要的字段）
    const workerNodes = nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
    }));

    // 准备连线数据
    const workerLinks = links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));

    workerRef.current.postMessage({
      type: 'init',
      nodes: workerNodes,
      links: workerLinks,
      config: {
        chargeStrength: config.chargeStrength || -300,
        linkDistance: config.linkDistance || 120,
        alphaDecay: config.alphaDecay || 0.05,
        velocityDecay: config.velocityDecay || 0.4,
        warmupTicks: config.warmupTicks || 0,
        cooldownTicks: config.cooldownTicks || 50,
      },
    });
  }, [nodes, links, config, enabled]);

  // 手动触发一次 tick
  const tick = useCallback(() => {
    if (workerRef.current && enabled) {
      workerRef.current.postMessage({ type: 'tick' });
    }
  }, [enabled]);

  // 停止模拟
  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
    }
  }, []);

  return {
    initSimulation,
    tick,
    stop,
    isReady: isInitializedRef.current,
  };
};
