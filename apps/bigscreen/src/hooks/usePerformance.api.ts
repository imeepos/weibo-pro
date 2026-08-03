/**
 * API性能监控Hook
 */

import { useState, useCallback } from 'react';
import { performanceMonitor } from '@/utils/performance';

export function useAPIPerformance() {
  const [apiStats, setApiStats] = useState({
    totalCalls: 0,
    averageDuration: 0,
    slowCalls: 0,
    errorCalls: 0,
  });

  const recordAPICall = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    size: number = 0
  ) => {
    performanceMonitor.recordAPICall({
      endpoint,
      method,
      duration,
      status,
      size,
      timestamp: Date.now(),
    });

    // 更新统计信息
    setApiStats(prev => ({
      totalCalls: prev.totalCalls + 1,
      averageDuration: (prev.averageDuration * prev.totalCalls + duration) / (prev.totalCalls + 1),
      slowCalls: prev.slowCalls + (duration > 2000 ? 1 : 0),
      errorCalls: prev.errorCalls + (status >= 400 ? 1 : 0),
    }));
  }, []);

  const measureAPICall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let status = 200;
    let size = 0;

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      // 估算响应大小
      if (result && typeof result === 'object') {
        size = JSON.stringify(result).length;
      }

      recordAPICall(endpoint, method, duration, status, size);
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      status = error.status || error.code || 500;
      recordAPICall(endpoint, method, duration, status, size);
      throw error;
    }
  }, [recordAPICall]);

  return {
    apiStats,
    recordAPICall,
    measureAPICall,
  };
}
