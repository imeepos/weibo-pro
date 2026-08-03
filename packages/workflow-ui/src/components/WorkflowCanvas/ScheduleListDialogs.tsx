'use client'

import React from 'react'
import type { WorkflowScheduleEntity } from '@sker/entities'
import type { WorkflowGraphAst } from '@sker/workflow'
import { ScheduleDialog } from './ScheduleDialog'
import { RunConfigDialog } from './RunConfigDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sker/ui/components/ui/alert-dialog'

/**
 * 调度列表弹窗集合
 *
 * 职责:集中渲染调度列表相关的所有弹窗——
 * 新建/编辑调度对话框、手动触发运行配置对话框、删除确认对话框。
 */
export interface ScheduleListDialogsProps {
  workflowName: string
  editSchedule: WorkflowScheduleEntity | null
  onEditClose: () => void
  showCreateDialog: boolean
  onCreateOpenChange: (open: boolean) => void
  deleteScheduleId: string | null
  onDeleteClose: () => void
  onConfirmDelete: () => void
  triggerDialogSchedule: WorkflowScheduleEntity | null
  workflowAst: WorkflowGraphAst | null
  onConfirmTrigger: (inputs: Record<string, unknown>) => void
  onCancelTrigger: () => void
  onRefresh: () => void
}

export function ScheduleListDialogs({
  workflowName,
  editSchedule,
  onEditClose,
  showCreateDialog,
  onCreateOpenChange,
  deleteScheduleId,
  onDeleteClose,
  onConfirmDelete,
  triggerDialogSchedule,
  workflowAst,
  onConfirmTrigger,
  onCancelTrigger,
  onRefresh,
}: ScheduleListDialogsProps) {
  return (
    <>
      {editSchedule && (
        <ScheduleDialog
          workflowName={workflowName}
          schedule={editSchedule}
          open={!!editSchedule}
          onOpenChange={(open) => !open && onEditClose()}
          onSuccess={onRefresh}
        />
      )}

      {showCreateDialog && (
        <ScheduleDialog
          workflowName={workflowName}
          open={showCreateDialog}
          onOpenChange={onCreateOpenChange}
          onSuccess={onRefresh}
        />
      )}

      {triggerDialogSchedule && workflowAst && (
        <RunConfigDialog
          visible={true}
          workflow={workflowAst}
          defaultInputs={triggerDialogSchedule.inputs || {}}
          onConfirm={onConfirmTrigger}
          onCancel={onCancelTrigger}
        />
      )}

      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && onDeleteClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个调度吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
