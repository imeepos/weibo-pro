/**
 * 性能配置文件
 *
 * 集中管理所有性能相关的阈值和参数
 * 可根据实际设备性能和数据规模动态调整
 */

export interface PerformanceBudget {
  // 数据量限制
  maxInitialNodes: number;        // 初始加载的最大节点数
  maxRenderNodes: number;          // 实际渲染的最大节点数
  maxEdges: number;                // 最大边数

  // 计算时间预算（毫秒）
  maxDataProcessingTime: number;   // 数据处理最大时间
  maxCommunityDetectionTime: number; // 社群检测最大时间
  maxRenderTime: number;           // 渲染最大时间

  // 渲染参数
  warmupTicks: number;             // 力导向预热帧数
  cooldownTicks: number;           // 力导向冷却帧数
  cooldownTime: number;            // 力导向冷却时间（毫秒）

  // 分层阈值
  coreLayerThreshold: number;      // 核心层节点数
  middleLayerThreshold: number;    // 中间层节点数

  // 特性开关
  enableCommunityDetection: boolean; // 默认启用社群检测
  enableAnimation: boolean;          // 默认启用动画
  enableWebWorker: boolean;          // 使用 Web Worker
}

/**
 * 默认配置（适合大多数场景）
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceBudget = {
  maxInitialNodes: 5000,
  maxRenderNodes: 2000,
  maxEdges: 10000,

  maxDataProcessingTime: 500,
  maxCommunityDetectionTime: 1000,
  maxRenderTime: 100,

  warmupTicks: 50,
  cooldownTicks: 100,
  cooldownTime: 2000,

  coreLayerThreshold: 2000,
  middleLayerThreshold: 10000,

  enableCommunityDetection: false,
  enableAnimation: true,
  enableWebWorker: false, // 需要构建配置支持
};

/**
 * 高性能配置（适合高端设备 + 小数据量）
 */
export const HIGH_PERFORMANCE_CONFIG: PerformanceBudget = {
  maxInitialNodes: 10000,
  maxRenderNodes: 5000,
  maxEdges: 20000,

  maxDataProcessingTime: 1000,
  maxCommunityDetectionTime: 2000,
  maxRenderTime: 200,

  warmupTicks: 100,
  cooldownTicks: 200,
  cooldownTime: 3000,

  coreLayerThreshold: 5000,
  middleLayerThreshold: 20000,

  enableCommunityDetection: true,
  enableAnimation: true,
  enableWebWorker: true,
};

/**
 * 低性能配置（适合低端设备或大数据量）
 */
export const LOW_PERFORMANCE_CONFIG: PerformanceBudget = {
  maxInitialNodes: 2000,
  maxRenderNodes: 1000,
  maxEdges: 5000,

  maxDataProcessingTime: 300,
  maxCommunityDetectionTime: 500,
  maxRenderTime: 50,

  warmupTicks: 30,
  cooldownTicks: 50,
  cooldownTime: 1000,

  coreLayerThreshold: 1000,
  middleLayerThreshold: 5000,

  enableCommunityDetection: false,
  enableAnimation: false,
  enableWebWorker: false,
};

/**
 * 根据设备性能自动选择配置
 */
export const getAdaptiveConfig = (): PerformanceBudget => {
  // 检测 CPU 核心数
  const cpuCores = navigator.hardwareConcurrency || 4;

  // 检测内存（如果可用）
  const memory = (performance as any).memory;
  const totalMemoryMB = memory ? memory.jsHeapSizeLimit / (1024 * 1024) : 0;

  // 检测 GPU（粗略判断）
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const hasWebGL = !!gl;

  // 决策逻辑
  if (cpuCores >= 8 && totalMemoryMB > 2000 && hasWebGL) {
    console.log('🚀 检测到高性能设备，使用高性能配置');
    return HIGH_PERFORMANCE_CONFIG;
  } else if (cpuCores <= 4 || totalMemoryMB < 1000) {
    console.log('⚠️ 检测到低性能设备，使用低性能配置');
    return LOW_PERFORMANCE_CONFIG;
  } else {
    console.log('✅ 使用默认性能配置');
    return DEFAULT_PERFORMANCE_CONFIG;
  }
};

/**
 * 性能监控器（用于运行时降级）
 */
export class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private maxHistoryLength = 60; // 保留最近 60 帧
  private config: PerformanceBudget;

  constructor(initialConfig: PerformanceBudget = DEFAULT_PERFORMANCE_CONFIG) {
    this.config = initialConfig;
  }

  recordFPS(fps: number) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
    }
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  /**
   * 判断是否需要降级
   */
  shouldDowngrade(): boolean {
    const avgFPS = this.getAverageFPS();
    return avgFPS < 25; // FPS < 25 时降级
  }

  /**
   * 自动降级配置
   */
  downgrade(): PerformanceBudget {
    console.warn('⚠️ 性能不足，自动降级配置');

    this.config = {
      ...this.config,
      maxRenderNodes: Math.floor(this.config.maxRenderNodes * 0.7),
      maxEdges: Math.floor(this.config.maxEdges * 0.7),
      warmupTicks: Math.floor(this.config.warmupTicks * 0.7),
      cooldownTicks: Math.floor(this.config.cooldownTicks * 0.7),
      enableCommunityDetection: false,
      enableAnimation: false,
    };

    return this.config;
  }

  /**
   * 判断是否可以升级
   */
  shouldUpgrade(): boolean {
    const avgFPS = this.getAverageFPS();
    return avgFPS > 50; // FPS > 50 时可升级
  }

  /**
   * 自动升级配置
   */
  upgrade(): PerformanceBudget {
    console.log('✅ 性能良好，自动升级配置');

    this.config = {
      ...this.config,
      maxRenderNodes: Math.min(5000, Math.floor(this.config.maxRenderNodes * 1.3)),
      maxEdges: Math.min(20000, Math.floor(this.config.maxEdges * 1.3)),
      enableAnimation: true,
    };

    return this.config;
  }

  getConfig(): PerformanceBudget {
    return this.config;
  }
}

/**
 * 性能调试工具
 */
export const logPerformanceInfo = () => {
  console.group('📊 性能信息');
  console.log('CPU 核心数:', navigator.hardwareConcurrency);

  const memory = (performance as any).memory;
  if (memory) {
    console.log('JS 堆内存:', {
      used: `${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(0)} MB`,
      total: `${(memory.totalJSHeapSize / (1024 * 1024)).toFixed(0)} MB`,
      limit: `${(memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)} MB`,
    });
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      console.log('GPU:', {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      });
    }
  }

  console.groupEnd();
};
