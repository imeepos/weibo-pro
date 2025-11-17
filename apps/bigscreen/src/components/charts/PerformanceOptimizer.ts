// 性能优化工具函数

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
    highDetail: 300,  // 近距离：高细节渲染
    mediumDetail: 600, // 中距离：中等细节
    lowDetail: 900    // 远距离：低细节
  },
  enableSampling: true,
  samplingStrategy: 'importance'
};

/**
 * 基于视距的分层渲染配置
 */
export const getLodConfig = (distance: number, config: PerformanceConfig) => {
  const { lodThresholds } = config;

  if (distance <= lodThresholds.highDetail) {
    return {
      level: 'high' as const,
      nodeGeometry: 32, // 高细分球体
      linkParticles: 10,
      showLabels: true,
      linkOpacity: 0.6
    };
  } else if (distance <= lodThresholds.mediumDetail) {
    return {
      level: 'medium' as const,
      nodeGeometry: 24, // 中等细分球体
      linkParticles: 6,
      showLabels: true,
      linkOpacity: 0.4
    };
  } else {
    return {
      level: 'low' as const,
      nodeGeometry: 16, // 低细分球体
      linkParticles: 3,
      showLabels: false,
      linkOpacity: 0.2
    };
  }
};

/**
 * 大数据集采样策略
 */
export const createSamplingStrategy = (
  nodes: any[],
  edges: any[],
  config: PerformanceConfig
): { nodes: any[]; edges: any[]; samplingRate: number } => {
  if (nodes.length <= config.maxNodes && edges.length <= config.maxLinks) {
    return { nodes, edges, samplingRate: 1 };
  }

  let sampledNodes: any[];
  let sampledEdges: any[];

  switch (config.samplingStrategy) {
    case 'importance':
      // 基于影响力的重要性采样
      const sortedNodes = nodes.sort((a, b) => (b.influence || 0) - (a.influence || 0));
      sampledNodes = sortedNodes.slice(0, config.maxNodes);
      break;

    case 'random':
      // 随机采样
      sampledNodes = nodes
        .sort(() => Math.random() - 0.5)
        .slice(0, config.maxNodes);
      break;

    case 'hybrid':
    default:
      // 混合策略：前70%基于重要性，后30%随机
      const importanceCount = Math.floor(config.maxNodes * 0.7);
      const randomCount = config.maxNodes - importanceCount;

      const sortedByImportance = nodes.sort((a, b) => (b.influence || 0) - (a.influence || 0));
      const importanceNodes = sortedByImportance.slice(0, importanceCount);

      const remainingNodes = sortedByImportance.slice(importanceCount);
      const randomNodes = remainingNodes
        .sort(() => Math.random() - 0.5)
        .slice(0, randomCount);

      sampledNodes = [...importanceNodes, ...randomNodes];
      break;
  }

  const sampledNodeIds = new Set(sampledNodes.map(n => n.id));

  // 保留采样节点间的连接
  sampledEdges = edges.filter(edge => {
    const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
    const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
    return sampledNodeIds.has(sourceId) && sampledNodeIds.has(targetId);
  });

  // 如果连接数仍然过多，进一步采样
  if (sampledEdges.length > config.maxLinks) {
    sampledEdges = sampledEdges
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, config.maxLinks);
  }

  const samplingRate = sampledNodes.length / nodes.length;

  return {
    nodes: sampledNodes,
    edges: sampledEdges,
    samplingRate
  };
};

/**
 * 内存使用监控
 */
export class MemoryMonitor {
  private samples: number[] = [];
  private maxSamples = 100;

  recordMemoryUsage() {
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

/**
 * 帧率监控和自适应降级
 */
export class FrameRateMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 60; // 保留最近60帧
  private lastTime = performance.now();

  recordFrame() {
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

/**
 * 自适应性能配置
 */
export const getAdaptivePerformanceConfig = (
  currentConfig: PerformanceConfig,
  frameRate: number,
  memoryUsageMB: number
): PerformanceConfig => {
  let newConfig = { ...currentConfig };

  // 基于帧率调整
  if (frameRate < 25) {
    // 性能较差，启用更激进的优化
    newConfig.maxNodes = Math.max(500, Math.floor(currentConfig.maxNodes * 0.7));
    newConfig.maxLinks = Math.max(2000, Math.floor(currentConfig.maxLinks * 0.7));
    newConfig.enableLod = true;
    newConfig.enableSampling = true;
    newConfig.samplingStrategy = 'importance'; // 确保使用重要性采样
  } else if (frameRate < 40) {
    // 性能中等，适度优化
    newConfig.maxNodes = Math.max(800, Math.floor(currentConfig.maxNodes * 0.9));
    newConfig.maxLinks = Math.max(4000, Math.floor(currentConfig.maxLinks * 0.9));
  }

  // 基于内存使用调整
  if (memoryUsageMB > 400) {
    newConfig.maxNodes = Math.max(500, Math.floor(newConfig.maxNodes * 0.8));
    newConfig.maxLinks = Math.max(2000, Math.floor(newConfig.maxLinks * 0.8));
    newConfig.enableSampling = true;
    newConfig.samplingStrategy = 'hybrid'; // 内存压力大时使用混合采样
  }

  return newConfig;
};