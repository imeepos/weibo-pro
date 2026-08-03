'use client'

import React from 'react'
import {
  PlayIcon,
  SaveIcon,
  SettingsIcon,
  Clock,
  XCircle,
  History,
  Database,
  Bug,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'

import { controlButtonClassName } from './workflow-controls-types.js'

export interface RunControlsProps {
  onRun?: () => void
  onDebugRun?: () => void
  onCancel?: () => void
  onSave?: () => void
  onSettings?: () => void
  onScheduleList?: () => void
  onRunHistory?: () => void
  onEventStoreToggle?: (enabled: boolean) => void
  isRunning?: boolean
  isSaving?: boolean
  eventStoreEnabled?: boolean
}

/** 运行、调试、设置、调度、历史、事件存储、保存 */
export const RunControls: React.FC<RunControlsProps> = ({
  onRun,
  onDebugRun,
  onCancel,
  onSave,
  onSettings,
  onScheduleList,
  onRunHistory,
  onEventStoreToggle,
  isRunning = false,
  isSaving = false,
  eventStoreEnabled = false,
}) => {
  return (
    <>
      {/* 运行 / 取消 */}
      {(onRun || onCancel) && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={isRunning ? onCancel : onRun}
          title={isRunning ? '取消运行' : '运行工作流'}
          className={cn(
            controlButtonClassName,
            isRunning && 'text-destructive hover:text-destructive hover:bg-destructive/10'
          )}
        >
          {isRunning ? (
            <XCircle className="h-4 w-4" strokeWidth={2} />
          ) : (
            <PlayIcon className="h-4 w-4" strokeWidth={2} />
          )}
        </Button>
      )}

      {/* 调试运行 */}
      {onDebugRun && !isRunning && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDebugRun}
          title="调试运行工作流&#10;自动开启事件存储并运行"
          className={cn(controlButtonClassName, 'text-primary/80 hover:text-primary')}
        >
          <Bug className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 设置 */}
      {onSettings && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSettings}
          title="工作流设置"
          className={controlButtonClassName}
        >
          <SettingsIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 调度 */}
      {onScheduleList && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onScheduleList}
          title="调度管理"
          className={controlButtonClassName}
        >
          <Clock className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 运行历史 */}
      {onRunHistory && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRunHistory}
          title="运行历史"
          className={controlButtonClassName}
        >
          <History className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 事件存储开关 */}
      {onEventStoreToggle && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEventStoreToggle(!eventStoreEnabled)}
          title={
            eventStoreEnabled
              ? '关闭事件存储\n点击后将不再记录工作流事件'
              : '开启事件存储\n支持时间旅行和续跑功能'
          }
          className={cn(
            controlButtonClassName,
            eventStoreEnabled && 'text-primary bg-primary/10 hover:bg-primary/20'
          )}
        >
          <Database className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 保存 */}
      {onSave && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSave}
          disabled={isSaving}
          title={isSaving ? '保存中...' : '保存工作流'}
          className={cn(
            controlButtonClassName,
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <SaveIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
    </>
  )
}
