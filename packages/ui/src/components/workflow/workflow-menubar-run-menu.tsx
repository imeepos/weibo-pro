'use client'

import React from 'react'
import { Zap, XCircle, PlayIcon, Bug, Clock, History } from 'lucide-react'
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'
import type { WorkflowMenubarProps } from './workflow-menubar-types'

export interface RunMenuProps
  extends Pick<
    WorkflowMenubarProps,
    'onRun' | 'onDebugRun' | 'onCancel' | 'onSchedule' | 'onScheduleList' | 'onRunHistory' | 'isRunning'
  > {}

export function RunMenu({
  onRun,
  onDebugRun,
  onCancel,
  onSchedule,
  onScheduleList,
  onRunHistory,
  isRunning = false,
}: RunMenuProps) {
  if (!(onRun || onDebugRun || onCancel || onSchedule || onScheduleList || onRunHistory)) return null

  return (
    <MenubarMenu>
      <MenubarTrigger>
        <Zap className="mr-1.5 h-3.5 w-3.5" />
        运行
      </MenubarTrigger>
      <MenubarContent>
        {(onRun || onCancel) && (
          <MenubarItem
            onSelect={isRunning ? onCancel : onRun}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                取消运行
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                运行工作流
              </>
            )}
          </MenubarItem>
        )}
        {onDebugRun && !isRunning && (
          <MenubarItem onSelect={onDebugRun}>
            <Bug className="mr-2 h-4 w-4" />
            调试运行工作流
          </MenubarItem>
        )}
        {(onSchedule || onScheduleList || onRunHistory) && (onRun || onDebugRun || onCancel) && (
          <MenubarSeparator />
        )}
        {onSchedule && (
          <MenubarItem onSelect={onSchedule}>
            <Clock className="mr-2 h-4 w-4" />
            创建调度
          </MenubarItem>
        )}
        {onScheduleList && (
          <MenubarItem onSelect={onScheduleList}>
            <Clock className="mr-2 h-4 w-4" />
            调度管理
          </MenubarItem>
        )}
        {onRunHistory && (
          <MenubarItem onSelect={onRunHistory}>
            <History className="mr-2 h-4 w-4" />
            运行历史
          </MenubarItem>
        )}
      </MenubarContent>
    </MenubarMenu>
  )
}
