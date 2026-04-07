export interface RunTestOptions {
  scheduleId: string
  maxMs?: number
}

export interface ParsedLogEntry {
  message?: string
  meta?: Record<string, unknown>
}

export function parseRunTestArgs(args: string[]): RunTestOptions {
  const scheduleId = args
    .map(arg => arg.trim())
    .find(arg => arg.startsWith('--schedule-id='))?.split('=')[1]
    ?? args
      .map(arg => arg.trim())
      .find((arg, index) => args[index - 1] === '--schedule-id')

  if (!scheduleId) {
    throw new Error('Missing required argument: --schedule-id <id>')
  }

  const maxMsValue = args
    .map(arg => arg.trim())
    .find(arg => arg.startsWith('--max-ms='))?.split('=')[1]
    ?? args
      .map(arg => arg.trim())
      .find((arg, index) => args[index - 1] === '--max-ms')

  const parsedMaxMs = maxMsValue ? Number(maxMsValue) : undefined
  if (
    maxMsValue &&
    (typeof parsedMaxMs !== 'number' || !Number.isFinite(parsedMaxMs) || parsedMaxMs <= 0)
  ) {
    throw new Error('Invalid --max-ms value')
  }

  return { scheduleId, maxMs: parsedMaxMs }
}

export function parseLoggerArgs(args: unknown[]): ParsedLogEntry {
  const [message, meta] = args
  return {
    message: typeof message === 'string' ? message : undefined,
    meta: isRecord(meta) ? meta : undefined
  }
}

export function isTargetScheduleLog(entry: ParsedLogEntry, scheduleId: string): boolean {
  return entry.meta?.scheduleId === scheduleId
}

export function isWorkflowTerminalMismatch(entry: ParsedLogEntry, scheduleId: string): boolean {
  return (
    entry.message === '工作流执行未收到 workflow 终态事件' &&
    entry.meta?.scheduleId === scheduleId
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
