/**
 * 性能监控工具 - 统一导出
 * 提供前端性能监控、分析和优化建议
 */

export type {
  PerformanceMetric,
  WebVitalMetric,
  PerformanceReport,
  APIPerformanceData,
  ComponentPerformanceData,
  PerformanceMemoryInfo,
  PerformanceWithMemory,
} from './types';

export { PerformanceMonitor } from './performance-monitor';
export { performanceMonitor, measureAsync, measureSync } from './utils';
