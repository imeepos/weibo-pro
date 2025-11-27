export interface PerformanceConfig {
  maxNodes: number;
  maxLinks: number;
  enableLod: boolean;
  lodThresholds: {
    highDetail: number;
    mediumDetail: number;
    lowDetail: number;
  };
  enableSampling: boolean;
  samplingStrategy: 'importance' | 'random' | 'hybrid';
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxNodes: 1000,
  maxLinks: 5000,
  enableLod: true,
  lodThresholds: {
    highDetail: 300,
    mediumDetail: 600,
    lowDetail: 900
  },
  enableSampling: true,
  samplingStrategy: 'importance'
};

export interface LodLevel {
  level: 'high' | 'medium' | 'low';
  nodeGeometry: number;
  linkParticles: number;
  showLabels: boolean;
  linkOpacity: number;
}

export const getLodConfig = (distance: number, config: PerformanceConfig): LodLevel => {
  const { lodThresholds } = config;

  if (distance <= lodThresholds.highDetail) {
    return {
      level: 'high',
      nodeGeometry: 32,
      linkParticles: 10,
      showLabels: true,
      linkOpacity: 0.6
    };
  }

  if (distance <= lodThresholds.mediumDetail) {
    return {
      level: 'medium',
      nodeGeometry: 24,
      linkParticles: 6,
      showLabels: true,
      linkOpacity: 0.4
    };
  }

  return {
    level: 'low',
    nodeGeometry: 16,
    linkParticles: 3,
    showLabels: false,
    linkOpacity: 0.2
  };
};

interface GraphNode {
  id: string;
}

interface GraphEdge {
  source: string | { id: string };
  target: string | { id: string };
  weight?: number;
}

const normalizeId = (id: string | { id: string }): string =>
  typeof id === 'object' ? id.id : id;

export const createSamplingStrategy = <N extends GraphNode, E extends GraphEdge>(
  nodes: N[],
  edges: E[],
  config: PerformanceConfig,
  sortFn?: (a: N, b: N) => number
): { nodes: N[]; edges: E[]; samplingRate: number } => {
  if (nodes.length <= config.maxNodes && edges.length <= config.maxLinks) {
    return { nodes, edges, samplingRate: 1 };
  }

  let sampledNodes: N[];

  switch (config.samplingStrategy) {
    case 'importance':
      if (!sortFn) {
        throw new Error('sortFn is required for importance sampling');
      }
      sampledNodes = [...nodes].sort(sortFn).slice(0, config.maxNodes);
      break;

    case 'random':
      sampledNodes = [...nodes].sort(() => Math.random() - 0.5).slice(0, config.maxNodes);
      break;

    case 'hybrid':
    default:
      if (!sortFn) {
        throw new Error('sortFn is required for hybrid sampling');
      }
      const importanceCount = Math.floor(config.maxNodes * 0.7);
      const randomCount = config.maxNodes - importanceCount;

      const sortedByImportance = [...nodes].sort(sortFn);
      const importanceNodes = sortedByImportance.slice(0, importanceCount);
      const remainingNodes = sortedByImportance.slice(importanceCount);
      const randomNodes = remainingNodes.sort(() => Math.random() - 0.5).slice(0, randomCount);

      sampledNodes = [...importanceNodes, ...randomNodes];
      break;
  }

  const sampledNodeIds = new Set(sampledNodes.map(n => n.id));

  let sampledEdges = edges.filter(edge => {
    const sourceId = normalizeId(edge.source);
    const targetId = normalizeId(edge.target);
    return sampledNodeIds.has(sourceId) && sampledNodeIds.has(targetId);
  });

  if (sampledEdges.length > config.maxLinks) {
    sampledEdges = sampledEdges
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, config.maxLinks);
  }

  return {
    nodes: sampledNodes,
    edges: sampledEdges,
    samplingRate: sampledNodes.length / nodes.length
  };
};

export class MemoryMonitor {
  private samples: number[] = [];
  private maxSamples = 100;

  recordMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        this.samples.push(memory.usedJSHeapSize);
        if (this.samples.length > this.maxSamples) {
          this.samples.shift();
        }
      }
    }
  }

  getMemoryStats() {
    if (this.samples.length === 0) return null;

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const max = Math.max(...this.samples);
    const min = Math.min(...this.samples);

    return {
      current: this.samples[this.samples.length - 1],
      average: avg,
      max,
      min,
      samples: this.samples.length
    };
  }

  isMemoryCritical(thresholdMB: number = 500): boolean {
    const stats = this.getMemoryStats();
    if (!stats) return false;

    const currentMB = stats.current / (1024 * 1024);
    return currentMB > thresholdMB;
  }
}

export class FrameRateMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 60;
  private lastTime = performance.now();

  recordFrame(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  getFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes[this.frameTimes.length - 1];
  }

  isPerformanceLow(targetFPS: number = 30): boolean {
    return this.getFPS() < targetFPS;
  }

  getPerformanceLevel(): 'high' | 'medium' | 'low' {
    const fps = this.getFPS();
    if (fps >= 50) return 'high';
    if (fps >= 25) return 'medium';
    return 'low';
  }
}

export const getAdaptivePerformanceConfig = (
  currentConfig: PerformanceConfig,
  frameRate: number,
  memoryUsageMB: number
): PerformanceConfig => {
  const newConfig = { ...currentConfig };

  if (frameRate < 25) {
    newConfig.maxNodes = Math.max(500, Math.floor(currentConfig.maxNodes * 0.7));
    newConfig.maxLinks = Math.max(2000, Math.floor(currentConfig.maxLinks * 0.7));
    newConfig.enableLod = true;
    newConfig.enableSampling = true;
    newConfig.samplingStrategy = 'importance';
  } else if (frameRate < 40) {
    newConfig.maxNodes = Math.max(800, Math.floor(currentConfig.maxNodes * 0.9));
    newConfig.maxLinks = Math.max(4000, Math.floor(currentConfig.maxLinks * 0.9));
  }

  if (memoryUsageMB > 400) {
    newConfig.maxNodes = Math.max(500, Math.floor(newConfig.maxNodes * 0.8));
    newConfig.maxLinks = Math.max(2000, Math.floor(newConfig.maxLinks * 0.8));
    newConfig.enableSampling = true;
    newConfig.samplingStrategy = 'hybrid';
  }

  return newConfig;
};
