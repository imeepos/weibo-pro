/**
 * 全局/页面/资源性能监控 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor, PerformanceReport, PerformanceMetric } from '@/utils/performance';
import { createLogger } from '@sker/core';

const logger = createLogger('usePerformance');

/**
 * 全局性能监控Hook
 */
export function useGlobalPerformance() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<Record<string, number>>({});

  // 定期更新性能报告
  useEffect(() => {
    const updateReport = () => {
      const newReport = performanceMonitor.generateReport();
      const newMemoryUsage = performanceMonitor.getMemoryUsage();

      setReport(newReport);
      setMemoryUsage(newMemoryUsage);
    };

    // 立即更新一次
    updateReport();

    // 每30秒更新一次
    const interval = setInterval(updateReport, 30000);

    return () => clearInterval(interval);
  }, []);

  const getMetricsByCategory = useCallback((category: PerformanceMetric['category']) => {
    return performanceMonitor.getMetricsByCategory(category);
  }, []);

  const clearHistory = useCallback(() => {
    performanceMonitor.clearHistory();
    setReport(null);
    setMemoryUsage({});
  }, []);

  return {
    report,
    memoryUsage,
    getMetricsByCategory,
    clearHistory,
  };
}

/**
 * 页面加载性能Hook
 */
export function usePageLoadPerformance() {
  const [loadMetrics, setLoadMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    // 等待页面完全加载
    const updateLoadMetrics = () => {
      if (document.readyState === 'complete') {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            domParse: navigation.domInteractive - navigation.responseEnd,
            domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          };

          setLoadMetrics(metrics);

          logger.info('Page load metrics', metrics);
        }
      }
    };

    if (document.readyState === 'complete') {
      updateLoadMetrics();
    } else {
      window.addEventListener('load', updateLoadMetrics);
      return () => window.removeEventListener('load', updateLoadMetrics);
    }
  }, []);

  return loadMetrics;
}

/**
 * 资源加载性能Hook
 */
export function useResourcePerformance() {
  const [resourceStats, setResourceStats] = useState({
    totalResources: 0,
    totalSize: 0,
    largeResources: 0,
    slowResources: 0,
  });

  useEffect(() => {
    // 获取所有资源性能条目
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    let totalSize = 0;
    let largeResources = 0;
    let slowResources = 0;

    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      const duration = resource.responseEnd - resource.startTime;

      totalSize += size;

      if (size > 1024 * 1024) { // 大于1MB
        largeResources++;
      }

      if (duration > 2000) { // 大于2秒
        slowResources++;
      }
    });

    setResourceStats({
      totalResources: resources.length,
      totalSize,
      largeResources,
      slowResources,
    });
  }, []);

  return resourceStats;
}
