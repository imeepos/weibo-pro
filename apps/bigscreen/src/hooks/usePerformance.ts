/**
 * 性能监控React Hook
 * 提供组件级别的性能监控和优化建议
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { performanceMonitor } from '@/utils/performance';
import { createLogger } from '@sker/core';

import { useAPIPerformance } from './usePerformance.api';
import {
  useGlobalPerformance,
  usePageLoadPerformance,
  useResourcePerformance,
} from './usePerformance.metrics';

export { useAPIPerformance };
export { useGlobalPerformance, usePageLoadPerformance, useResourcePerformance };

const logger = createLogger('usePerformance');

export interface UsePerformanceOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackUpdates?: boolean;
  warnOnSlowRender?: boolean;
  slowRenderThreshold?: number; // ms
}

export interface PerformanceStats {
  renderCount: number;
  averageRenderTime: number;
  slowRenders: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

/**
 * 组件性能监控Hook
 */
export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    componentName = 'UnknownComponent',
    trackRenders = true,
    warnOnSlowRender = true,
    slowRenderThreshold = 16, // 一帧的时间
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number | undefined>(undefined);
  const mountTimeRef = useRef<number | undefined>(undefined);

  const [stats, setStats] = useState<PerformanceStats>({
    renderCount: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
  });

  // 记录组件挂载时间
  useEffect(() => {
    mountTimeRef.current = performance.now();
    logger.debug(`Component ${componentName} mounted`, {
      mountTime: mountTimeRef.current,
    });

    return () => {
      const unmountTime = performance.now();
      const lifespanTime = mountTimeRef.current ? unmountTime - mountTimeRef.current : 0;

      logger.debug(`Component ${componentName} unmounted`, {
        lifespan: lifespanTime,
        renderCount: renderCountRef.current,
        averageRenderTime: renderTimesRef.current.length > 0
          ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
          : 0,
      });

      // 记录组件生命周期性能
      performanceMonitor.recordMetric({
        name: 'component.lifespan',
        value: lifespanTime,
        unit: 'ms',
        category: 'runtime',
        metadata: {
          component: componentName,
          renderCount: renderCountRef.current,
        },
      });
    };
  }, [componentName]);

  // 记录渲染开始时间
  const markRenderStart = useCallback(() => {
    if (trackRenders) {
      lastRenderStartRef.current = performance.now();
    }
  }, [trackRenders]);

  // 记录渲染结束时间
  const markRenderEnd = useCallback(() => {
    if (trackRenders && lastRenderStartRef.current) {
      const renderTime = performance.now() - lastRenderStartRef.current;
      renderCountRef.current += 1;
      renderTimesRef.current.push(renderTime);

      // 限制渲染时间数组大小
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-100);
      }

      // 记录到性能监控器
      performanceMonitor.recordComponentRender({
        componentName,
        renderTime,
        updateCount: renderCountRef.current,
        timestamp: Date.now(),
      });

      // 慢渲染警告
      if (warnOnSlowRender && renderTime > slowRenderThreshold) {
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          threshold: `${slowRenderThreshold}ms`,
          renderCount: renderCountRef.current,
        });
      }

      // 更新统计信息
      const totalRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0);
      const slowRenders = renderTimesRef.current.filter(time => time > slowRenderThreshold).length;

      setStats({
        renderCount: renderCountRef.current,
        averageRenderTime: totalRenderTime / renderTimesRef.current.length,
        slowRenders,
        lastRenderTime: renderTime,
        totalRenderTime,
      });

      lastRenderStartRef.current = undefined;
    }
  }, [trackRenders, componentName, warnOnSlowRender, slowRenderThreshold]);

  // 在每次渲染时自动记录
  useEffect(() => {
    markRenderStart();

    // 在下一个微任务中记录渲染结束时间
    Promise.resolve().then(() => {
      markRenderEnd();
    });
  });

  // 手动性能测量
  const measureFunction = useCallback(<T>(
    name: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> => {
    const fullName = `${componentName}.${name}`;
    const startTime = performance.now();

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.then(
          value => {
            const duration = performance.now() - startTime;
            performanceMonitor.recordMetric({
              name: fullName,
              value: duration,
              unit: 'ms',
              category: 'runtime',
              metadata: { component: componentName },
            });
            return value;
          },
          error => {
            const duration = performance.now() - startTime;
            performanceMonitor.recordMetric({
              name: `${fullName}.error`,
              value: duration,
              unit: 'ms',
              category: 'runtime',
              metadata: { component: componentName },
            });
            throw error;
          }
        );
      } else {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric({
          name: fullName,
          value: duration,
          unit: 'ms',
          category: 'runtime',
          metadata: { component: componentName },
        });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `${fullName}.error`,
        value: duration,
        unit: 'ms',
        category: 'runtime',
        metadata: { component: componentName },
      });
      throw error;
    }
  }, [componentName]);

  return {
    stats,
    markRenderStart,
    markRenderEnd,
    measureFunction,
  };
}
