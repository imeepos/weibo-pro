/**
 * 性能测量工具函数
 */

import { PerformanceMonitor } from './performance-monitor';
import type { PerformanceMetric } from './types';

/**
 * 性能监控器单例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

// 工具函数
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category: PerformanceMetric['category'] = 'runtime'
): Promise<T> {
  const startTime = performance.now();

  return fn().then(
    result => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        category,
      });
      return result;
    },
    error => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `${name}.error`,
        value: duration,
        unit: 'ms',
        category,
      });
      throw error;
    }
  );
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  category: PerformanceMetric['category'] = 'runtime'
): T {
  const startTime = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      category,
    });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name: `${name}.error`,
      value: duration,
      unit: 'ms',
      category,
    });
    throw error;
  }
}
