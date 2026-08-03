/**
 * 性能监控类型定义
 */

export type PerformanceMemoryInfo = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

export type PerformanceWithMemory = Performance & { memory?: PerformanceMemoryInfo };

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: string;
  category: 'load' | 'runtime' | 'user' | 'api' | 'memory';
  metadata?: Record<string, unknown>;
}

export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  webVitals: WebVitalMetric[];
  recommendations: string[];
  score: number; // 0-100
}

export interface APIPerformanceData {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  size: number;
  timestamp: number;
}

export interface ComponentPerformanceData {
  componentName: string;
  renderTime: number;
  updateCount: number;
  timestamp: number;
  props?: Record<string, unknown>;
}
