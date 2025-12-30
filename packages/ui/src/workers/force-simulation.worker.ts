/**
 * Force Simulation Web Worker
 *
 * 将 D3-force 力模拟计算移至后台线程，避免阻塞主线程
 * 性能提升：主线程保持响应，可利用多核 CPU
 */

import * as d3 from 'd3-force-3d';

interface WorkerNode {
  id: string | number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface WorkerLink {
  source: string | number;
  target: string | number;
  value?: number;
}

interface InitMessage {
  type: 'init';
  nodes: WorkerNode[];
  links: WorkerLink[];
  config: {
    chargeStrength?: number;
    linkDistance?: number;
    alphaDecay?: number;
    velocityDecay?: number;
    warmupTicks?: number;
    cooldownTicks?: number;
  };
}

interface TickMessage {
  type: 'tick';
}

interface StopMessage {
  type: 'stop';
}

type WorkerMessage = InitMessage | TickMessage | StopMessage;

let simulation: d3.Simulation<WorkerNode, WorkerLink> | null = null;
let tickCount = 0;
let maxTicks = 50;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      const { nodes, links, config } = message;

      // 停止旧的模拟
      if (simulation) {
        simulation.stop();
      }

      // 创建新的力模拟
      simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
          .id((d: any) => d.id)
          .distance(config.linkDistance || 120))
        .force('charge', d3.forceManyBody()
          .strength(config.chargeStrength || -300))
        .force('center', d3.forceCenter(0, 0, 0))
        .alphaDecay(config.alphaDecay || 0.05)
        .velocityDecay(config.velocityDecay || 0.4);

      tickCount = 0;
      maxTicks = config.cooldownTicks || 50;

      // 预热模拟
      const warmupTicks = config.warmupTicks || 0;
      for (let i = 0; i < warmupTicks; i++) {
        simulation.tick();
      }

      // 监听 tick 事件
      simulation.on('tick', () => {
        tickCount++;

        // 每 3 帧发送一次位置更新（降低通信频率）
        if (tickCount % 3 === 0) {
          const positions = new Float32Array(nodes.length * 3);
          nodes.forEach((node, i) => {
            positions[i * 3] = node.x || 0;
            positions[i * 3 + 1] = node.y || 0;
            positions[i * 3 + 2] = node.z || 0;
          });

          self.postMessage({
            type: 'tick',
            positions: positions.buffer,
            alpha: simulation!.alpha(),
            tickCount,
          }, [positions.buffer]);
        }

        // 达到最大 tick 数后停止
        if (tickCount >= maxTicks) {
          simulation!.stop();
          self.postMessage({
            type: 'end',
            tickCount,
          });
        }
      });

      self.postMessage({ type: 'ready' });
      break;
    }

    case 'tick': {
      if (simulation) {
        simulation.tick();
      }
      break;
    }

    case 'stop': {
      if (simulation) {
        simulation.stop();
        simulation = null;
      }
      break;
    }
  }
};

// 导出类型供主线程使用
export type { WorkerNode, WorkerLink, InitMessage, TickMessage, StopMessage };
