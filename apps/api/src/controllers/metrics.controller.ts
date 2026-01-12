import { Controller, Get } from '@sker/core'
import { PerformanceMonitor, metrics, type Metric } from '../utils/monitoring'
import { success } from '../utils/api-response'

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics() {
    const summary = PerformanceMonitor.getSummary()

    return success({
      summary,
      metrics: metrics.getMetrics(),
    })
  }

  @Get('prometheus')
  async getPrometheusMetrics() {
    const allMetrics = metrics.getMetrics()
    const prometheusFormat: string[] = []

    const grouped = new Map<string, Metric[]>()

    for (const metric of allMetrics) {
      const key = metric.name
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(metric)
    }

    for (const [name, values] of grouped) {
      const latest = values[values.length - 1]
      if (!latest) continue

      const labels = latest.labels
        ? Object.entries(latest.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')
        : ''

      const labelStr = labels ? `{${labels}}` : ''

      if (latest.type === 'counter') {
        const total = values.reduce((sum, m) => sum + m.value, 0)
        prometheusFormat.push(`# TYPE ${name} counter`)
        prometheusFormat.push(`${name}${labelStr} ${total}`)
      } else if (latest.type === 'gauge') {
        prometheusFormat.push(`# TYPE ${name} gauge`)
        prometheusFormat.push(`${name}${labelStr} ${latest.value}`)
      } else if (latest.type === 'histogram') {
        const count = values.length
        const sum = values.reduce((sum, m) => sum + m.value, 0)
        const avg = sum / count

        prometheusFormat.push(`# TYPE ${name} histogram`)
        prometheusFormat.push(`${name}_count${labelStr} ${count}`)
        prometheusFormat.push(`${name}_sum${labelStr} ${sum}`)
        prometheusFormat.push(`${name}_avg${labelStr} ${avg}`)
      }

      prometheusFormat.push('')
    }

    return new Response(prometheusFormat.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    })
  }
}
