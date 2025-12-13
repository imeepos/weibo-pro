import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { ScheduledWorkflowAst } from '@sker/workflow-ast'
import React from 'react'

/**
 * ScheduledWorkflowAst 渲染器
 *
 * 存在即合理：
 * - 节点预览显示调度状态
 * - 下次执行时间实时展示
 * - 启用/禁用状态清晰可见
 *
 * 优雅设计：
 * - 简洁的卡片式布局
 * - 状态徽章（已启用/已禁用）
 * - 调度类型标签（Cron/间隔/一次性）
 */
const ScheduledWorkflowComponent: React.FC<{ ast: ScheduledWorkflowAst }> = ({ ast }) => {
  const getScheduleTypeLabel = () => {
    switch (ast.scheduleType) {
      case 'cron':
        return 'Cron 调度'
      case 'interval':
        return '间隔调度'
      case 'once':
        return '一次性调度'
      default:
        return '手动触发'
    }
  }

  const getScheduleDetails = () => {
    switch (ast.scheduleType) {
      case 'cron':
        return ast.cronExpression || '-'
      case 'interval':
        return `${ast.intervalSeconds}秒`
      case 'once':
        return ast.startTime ? new Date(ast.startTime).toLocaleString('zh-CN') : '-'
      default:
        return '手动触发'
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">
          {ast.scheduleName || ast.workflowName}
        </div>
        <div
          className={`px-2 py-0.5 rounded text-xs ${
            ast.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {ast.enabled ? '已启用' : '已禁用'}
        </div>
      </div>

      {/* 调度类型 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">类型:</span>
        <span className="font-mono">{getScheduleTypeLabel()}</span>
      </div>

      {/* 调度详情 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">配置:</span>
        <span className="font-mono text-primary">{getScheduleDetails()}</span>
      </div>

      {/* 下次执行时间 */}
      {ast.nextRunAt && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">下次:</span>
          <span className="font-mono text-blue-600 dark:text-blue-400">
            {new Date(ast.nextRunAt).toLocaleString('zh-CN')}
          </span>
        </div>
      )}

      {/* 调度ID（用于追踪） */}
      {ast.scheduleId && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">ID:</span>
          <span className="font-mono text-xs text-gray-500">
            {ast.scheduleId.slice(0, 8)}...
          </span>
        </div>
      )}
    </div>
  )
}

@Injectable()
export class ScheduledWorkflowAstRender {
  @Render(ScheduledWorkflowAst)
  render(ast: ScheduledWorkflowAst) {
    return <ScheduledWorkflowComponent ast={ast} />
  }
}
