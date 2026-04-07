import 'dotenv/config'
import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-run'
import { root, logger } from '@sker/core'
import {
  entitiesProviders,
  ScheduleType,
  WorkflowScheduleEntity,
  useEntityManager
} from '@sker/entities'
import { EdgeModeStrategyProviders } from '@sker/workflow'
import { CronSchedulerService } from '@sker/workflow-run'
import {
  isTargetScheduleLog,
  isWorkflowTerminalMismatch,
  parseLoggerArgs,
  parseRunTestArgs
} from './run-test.helpers'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

async function main() {
  const { scheduleId } = parseRunTestArgs(process.argv.slice(2))

  root.set([...entitiesProviders, ...EdgeModeStrategyProviders])
  await root.init()

  const scheduler = root.get(CronSchedulerService)
  const targetSchedule = await loadSchedule(scheduleId)

  if (!targetSchedule) {
    throw new Error(`Schedule not found: ${scheduleId}`)
  }

  console.log(`[run-test] target schedule: ${targetSchedule.name} (${targetSchedule.id})`)
  console.log(`[run-test] scheduleType: ${targetSchedule.scheduleType}`)
  console.log(`[run-test] workflowId: ${targetSchedule.workflowId}`)
  console.log('[run-test] monitoring started, waiting for terminal mismatch...')

  let round = 0
  let watcherStopped = false
  const restoreLogger = installLoggerHooks({
    scheduleId,
    onTargetLog: (level, entry) => {
      if (entry.meta?.workflowId && entry.meta?.scheduleId === scheduleId) {
        round++
        console.log(
          `[run-test][round=${round}][${level}] ${entry.message ?? '<no-message>'} ${JSON.stringify(entry.meta)}`
        )
        return
      }

      console.log(
        `[run-test][${level}] ${entry.message ?? '<no-message>'} ${JSON.stringify(entry.meta ?? {})}`
      )
    },
    onMismatch: (entry) => {
      console.error('[run-test] detected workflow terminal mismatch')
      console.error(`[run-test] message: ${entry.message}`)
      console.error(`[run-test] meta: ${JSON.stringify(entry.meta ?? {}, null, 2)}`)
      shutdown(2).catch((error) => {
        console.error('[run-test] shutdown failed', error)
        process.exit(2)
      })
    }
  })

  const shutdown = async (code = 0) => {
    if (watcherStopped) {
      process.exit(code)
      return
    }

    watcherStopped = true
    restoreLogger()
    await scheduler.stopAll()
    process.exit(code)
  }

  process.on('SIGTERM', () => void shutdown(0))
  process.on('SIGINT', () => void shutdown(0))

  await scheduler.addSchedule(targetSchedule)
}

async function loadSchedule(scheduleId: string): Promise<WorkflowScheduleEntity | null> {
  return useEntityManager(async (manager) => {
    return manager.findOne(WorkflowScheduleEntity, { where: { id: scheduleId } })
  })
}

function installLoggerHooks(params: {
  scheduleId: string
  onTargetLog: (level: LogLevel, entry: ReturnType<typeof parseLoggerArgs>) => void
  onMismatch: (entry: ReturnType<typeof parseLoggerArgs>) => void
}): () => void {
  const original = {
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    debug: logger.debug.bind(logger)
  }

  const wrap = (level: LogLevel) => (...args: unknown[]) => {
    const entry = parseLoggerArgs(args)

    if (isTargetScheduleLog(entry, params.scheduleId)) {
      params.onTargetLog(level, entry)
    }

    if (level === 'warn' && isWorkflowTerminalMismatch(entry, params.scheduleId)) {
      params.onMismatch(entry)
    }

    original[level](...args)
  }

  logger.info = wrap('info')
  logger.warn = wrap('warn')
  logger.error = wrap('error')
  logger.debug = wrap('debug')

  return () => {
    logger.info = original.info
    logger.warn = original.warn
    logger.error = original.error
    logger.debug = original.debug
  }
}

main().catch((error) => {
  console.error('[run-test] failed', error)
  process.exit(1)
})
