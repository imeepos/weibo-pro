import { useEffect, useRef } from 'react';
import {
  FrameRateMonitor,
  MemoryMonitor,
  getAdaptivePerformanceConfig,
  type PerformanceConfig,
} from '@sker/ui/lib/graph-performance-optimizer';

/**
 * 性能监控和自适应优化 Hook：
 * 仅在 showDebugHud 开启时运行，每秒记录帧率与内存使用，
 * 当帧率过低或内存过高时，基于最新配置生成自适应性能配置。
 */
export function usePerformanceMonitor(
  showDebugHud: boolean,
  performanceConfigRef: { current: PerformanceConfig },
  onPerformanceConfigChange: (config: PerformanceConfig) => void
): void {
  const frameRateMonitorRef = useRef(new FrameRateMonitor());
  const memoryMonitorRef = useRef(new MemoryMonitor());

  useEffect(() => {
    if (!showDebugHud) return;

    const monitorInterval = setInterval(() => {
      frameRateMonitorRef.current.recordFrame();
      memoryMonitorRef.current.recordMemoryUsage();

      const currentFPS = frameRateMonitorRef.current.getFPS();
      const memoryStats = memoryMonitorRef.current.getMemoryStats();
      const memoryUsageMB = memoryStats ? memoryStats.current / (1024 * 1024) : 0;

      if (currentFPS < 25 || memoryUsageMB > 400) {
        // 使用 ref 获取最新的性能配置，避免循环依赖
        const newConfig = getAdaptivePerformanceConfig(performanceConfigRef.current, currentFPS, memoryUsageMB);
        onPerformanceConfigChange(newConfig);
      }
    }, 1000);

    return () => {
      clearInterval(monitorInterval);
    };
  }, [showDebugHud, performanceConfigRef, onPerformanceConfigChange]);
}
