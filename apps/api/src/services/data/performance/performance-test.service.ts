import { Injectable, Inject, Logger } from '@sker/core';
import { EventQueryService } from '../events/event-query.service';
import { OverviewService } from '../overview.service';

/**
 * 性能测试结果
 */
export interface PerformanceResult {
    endpoint: string;
    duration: number;
    success: boolean;
    cached?: boolean;
    error?: string;
}

/**
 * 性能统计指标
 */
export interface PerformanceMetrics {
    endpoint: string;
    totalRequests: number;
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    cacheHitRate: number;
}

/**
 * 性能测试服务
 *
 * 功能：
 * - 测量 API 端点响应时间
 * - 计算 P50/P95/P99 性能指标
 * - 统计缓存命中率
 * - 验证性能目标（P95 < 500ms）
 */
@Injectable({ providedIn: 'root' })
export class PerformanceTestService {
    private measurements = new Map<string, number[]>();

    constructor(
        @Inject(EventQueryService) private readonly eventQueryService: EventQueryService,
        @Inject(OverviewService) private readonly overviewService: OverviewService,
        @Inject(Logger, { optional: true })
        private readonly logger?: Logger
    ) {}

    /**
     * 测量单个端点的性能
     */
    async measureEndpoint<T>(
        endpoint: string,
        fn: () => Promise<T>
    ): Promise<PerformanceResult & { data?: T }> {
        const startTime = performance.now();
        let success = false;
        let data: T | undefined;
        let error: string | undefined;

        try {
            data = await fn();
            success = true;
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
            this.logger?.error(`性能测试失败: ${endpoint}`, e);
        }

        const duration = performance.now() - startTime;

        // 记录测量结果
        if (!this.measurements.has(endpoint)) {
            this.measurements.set(endpoint, []);
        }
        this.measurements.get(endpoint)!.push(duration);

        return {
            endpoint,
            duration,
            success,
            error,
            data
        };
    }

    /**
     * 运行多次请求并收集性能数据
     */
    async runMultipleRequests<T>(
        endpoint: string,
        fn: () => Promise<T>,
        count: number = 100
    ): Promise<PerformanceResult[]> {
        const results: PerformanceResult[] = [];

        for (let i = 0; i < count; i++) {
            const result = await this.measureEndpoint(endpoint, fn);
            results.push(result);
        }

        return results;
    }

    /**
     * 计算 P95 响应时间
     */
    calculateP95(durations: number[]): number {
        if (durations.length === 0) return 0;
        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * 0.95);
        return sorted[index] || 0;
    }

    /**
     * 计算 P50 响应时间（中位数）
     */
    calculateP50(durations: number[]): number {
        if (durations.length === 0) return 0;
        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * 0.5);
        return sorted[index] || 0;
    }

    /**
     * 计算 P99 响应时间
     */
    calculateP99(durations: number[]): number {
        if (durations.length === 0) return 0;
        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * 0.99);
        return sorted[index] || 0;
    }

    /**
     * 计算平均响应时间
     */
    calculateAverage(durations: number[]): number {
        if (durations.length === 0) return 0;
        const sum = durations.reduce((a, b) => a + b, 0);
        return sum / durations.length;
    }

    /**
     * 估算缓存命中率
     *
     * 假设：响应时间 < 100ms 的请求被认为是缓存命中
     */
    calculateCacheHitRate(results: PerformanceResult[]): number {
        if (results.length === 0) return 0;
        const hits = results.filter(r => r.duration < 100).length;
        return hits / results.length;
    }

    /**
     * 生成完整的性能指标报告
     */
    generateMetrics(endpoint: string): PerformanceMetrics | null {
        const durations = this.measurements.get(endpoint);
        if (!durations || durations.length === 0) return null;

        return {
            endpoint,
            totalRequests: durations.length,
            p50: this.calculateP50(durations),
            p95: this.calculateP95(durations),
            p99: this.calculateP99(durations),
            avg: this.calculateAverage(durations),
            min: Math.min(...durations),
            max: Math.max(...durations),
            cacheHitRate: 0 // 需要通过 runMultipleRequests 获取
        };
    }

    /**
     * 验证性能是否达到目标
     */
    verifyPerformanceTarget(endpoint: string, target: 'P95' | 'P99' | 'average', threshold: number): boolean {
        const metrics = this.generateMetrics(endpoint);
        if (!metrics) return false;

        switch (target) {
            case 'P95':
                return metrics.p95 < threshold;
            case 'P99':
                return metrics.p99 < threshold;
            case 'average':
                return metrics.avg < threshold;
            default:
                return false;
        }
    }

    /**
     * 清除测量数据
     */
    clearMeasurements(endpoint?: string): void {
        if (endpoint) {
            this.measurements.delete(endpoint);
        } else {
            this.measurements.clear();
        }
    }

    /**
     * 获取所有测量数据
     */
    getAllMeasurements(): Map<string, number[]> {
        return new Map(this.measurements);
    }
}
