import { describe, expect, it } from 'vitest'
import {
  isTargetScheduleLog,
  isWorkflowTerminalMismatch,
  parseLoggerArgs,
  parseRunTestArgs
} from './run-test.helpers'

describe('run-test helpers', () => {
  it('解析 --schedule-id=xxx 形式参数', () => {
    expect(parseRunTestArgs(['--schedule-id=abc'])).toEqual({ scheduleId: 'abc' })
  })

  it('解析 --schedule-id xxx 形式参数', () => {
    expect(parseRunTestArgs(['--schedule-id', 'def'])).toEqual({ scheduleId: 'def' })
  })

  it('缺少 scheduleId 时抛错', () => {
    expect(() => parseRunTestArgs([])).toThrow('Missing required argument')
  })

  it('只识别目标 scheduleId 的日志', () => {
    const entry = parseLoggerArgs(['x', { scheduleId: 'target-1' }])
    expect(isTargetScheduleLog(entry, 'target-1')).toBe(true)
    expect(isTargetScheduleLog(entry, 'other')).toBe(false)
  })

  it('识别 workflow 终态缺失警告', () => {
    const entry = parseLoggerArgs([
      '工作流执行未收到 workflow 终态事件',
      { scheduleId: 'target-1' }
    ])

    expect(isWorkflowTerminalMismatch(entry, 'target-1')).toBe(true)
    expect(isWorkflowTerminalMismatch(entry, 'other')).toBe(false)
  })
})
