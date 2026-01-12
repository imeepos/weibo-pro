import { hrtime } from 'process'

export interface Metric {
  name: string
  type: 'counter' | 'gauge' | 'histogram'
  value: number
  timestamp: number
  labels?: Record<string, string>
}

export interface Span {
  name: string
  startTime: bigint
  endTime?: bigint
  duration?: number
  labels?: Record<string, string>
  parent?: Span
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map()
  private readonly maxMetrics = 1000

  record(metric: Metric): void {
    const key = `${metric.type}:${metric.name}`
    const existing = this.metrics.get(key) || []

    existing.push(metric)

    if (existing.length > this.maxMetrics) {
      existing.shift()
    }

    this.metrics.set(key, existing)
  }

  increment(name: string, value = 1, labels?: Record<string, string>): void {
    this.record({
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  getMetrics(type?: string): Metric[] {
    if (type) {
      const metrics: Metric[] = []
      for (const [, values] of this.metrics) {
        metrics.push(...values.filter(m => m.type === type))
      }
      return metrics
    }

    const all: Metric[] = []
    for (const [, values] of this.metrics) {
      all.push(...values)
    }
    return all
  }

  getMetricsByName(name: string): Metric[] {
    const metrics: Metric[] = []
    for (const [key, values] of this.metrics) {
      if (key.includes(name)) {
        metrics.push(...values)
      }
    }
    return metrics
  }

  clear(): void {
    this.metrics.clear()
  }
}

class Tracer {
  private currentSpan: Span | null = null

  startSpan(name: string, labels?: Record<string, string>): Span {
    const span: Span = {
      name,
      startTime: hrtime.bigint(),
      labels,
      parent: this.currentSpan || undefined,
    }

    this.currentSpan = span
    return span
  }

  endSpan(span: Span): number {
    span.endTime = hrtime.bigint()
    span.duration = Number(span.endTime - span.startTime) / 1000000

    if (this.currentSpan === span) {
      this.currentSpan = span.parent || null
    }

    return span.duration
  }

  getCurrentSpan(): Span | null {
    return this.currentSpan
  }

  async trace<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const span = this.startSpan(name, labels)
    try {
      const result = await fn()
      this.endSpan(span)
      metrics.histogram('span.duration', span.duration!, {
        ...labels,
        name,
      })
      return result
    } catch (error) {
      this.endSpan(span)
      metrics.increment('span.errors', 1, {
        ...labels,
        name,
        error: error instanceof Error ? error.name : 'unknown',
      })
      throw error
    }
  }
}

export const metrics = new MetricsCollector()
export const tracer = new Tracer()

export class PerformanceMonitor {
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = hrtime.bigint()
    try {
      const result = await fn()
      const duration = Number(hrtime.bigint() - start) / 1000000

      metrics.histogram('operation.duration', duration, {
        ...labels,
        name,
        status: 'success',
      })

      return result
    } catch (error) {
      const duration = Number(hrtime.bigint() - start) / 1000000

      metrics.histogram('operation.duration', duration, {
        ...labels,
        name,
        status: 'error',
      })

      metrics.increment('operation.errors', 1, {
        ...labels,
        name,
        error: error instanceof Error ? error.name : 'unknown',
      })

      throw error
    }
  }

  static recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    metrics.increment('http.requests', 1, {
      method,
      path,
      status: statusCode.toString(),
    })

    metrics.histogram('http.request_duration', duration, {
      method,
      path,
      status: statusCode.toString(),
    })
  }

  static recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    error?: string
  ): void {
    metrics.histogram('db.query_duration', duration, {
      operation,
      table,
    })

    if (error) {
      metrics.increment('db.query_errors', 1, {
        operation,
        table,
        error,
      })
    }
  }

  static recordExternalServiceCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    metrics.histogram('external_service.duration', duration, {
      service,
      operation,
      status: success ? 'success' : 'error',
    })

    if (!success) {
      metrics.increment('external_service.errors', 1, {
        service,
        operation,
      })
    }
  }

  static getSummary() {
    const httpRequests = metrics.getMetricsByName('http.requests')
    const totalRequests = httpRequests.filter(m => m.type === 'counter').length

    const durations = metrics.getMetricsByName('http.request_duration').filter(m => m.type === 'histogram')
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, m) => sum + m.value, 0) / durations.length
      : 0

    const errors = metrics.getMetricsByName('operation.errors').filter(m => m.type === 'counter')
    const totalErrors = errors.reduce((sum, m) => sum + m.value, 0)

    return {
      totalRequests,
      totalErrors,
      avgDuration: Math.round(avgDuration * 100) / 100,
      metricsCount: metrics.getMetrics().length,
    }
  }
}

export function createMonitoringMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const start = hrtime.bigint()

    await next()

    const duration = Number(hrtime.bigint() - start) / 1000000

    PerformanceMonitor.recordHttpRequest(
      c.req.method,
      c.req.path,
      c.res.status,
      duration
    )
  }
}
