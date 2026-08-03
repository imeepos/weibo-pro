'use client'

import React from 'react'
import { Clock, Settings } from 'lucide-react'
import type { WorkflowScheduleEntity } from '@sker/entities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@sker/ui/components/ui/dialog'
import { Button } from '@sker/ui/components/ui/button'
import {
  ScheduleForm,
} from '@sker/ui/components/ui/schedule-form'
import { RunConfigDialog } from './RunConfigDialog'
import { useScheduleDialog } from './useScheduleDialog'
import { CRON_TEMPLATES, INTERVAL_UNITS } from './schedule-dialog-utils'

/**
 * 调度对话框
 *
 * 存在即合理:
 * - 创建工作流调度任务
 * - 编辑现有调度配置
 * - 支持多种调度类型(Cron/间隔/一次性/手动)
 * - 自动计算下次执行时间
 * - 通过 RunConfigDialog 配置输入参数
 *
 * 优雅设计:
 * - 使用 @sker/ui Dialog 和 ScheduleForm 组件
 * - 复用 RunConfigDialog 处理参数配置
 * - 响应式布局
 * - 编辑模式自动填充数据
 */
export interface ScheduleDialogProps {
  workflowName: string
  schedule?: WorkflowScheduleEntity | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ScheduleDialog({
  workflowName,
  schedule,
  open,
  onOpenChange,
  onSuccess
}: ScheduleDialogProps) {
  const state = useScheduleDialog({
    workflowName,
    schedule,
    open,
    onOpenChange,
    onSuccess,
  })

  const {
    loading,
    error,
    formData,
    setFormData,
    workflowAst,
    showRunConfig,
    isEditMode,
    currentInputs,
    hasInputParams,
    shouldShowScheduleDialog,
    handleSubmit,
    handleRunConfigConfirm,
    handleRunConfigCancel,
    handleOpenRunConfig,
    handleDialogOpenChange,
  } = state

  return (
    <>
      <Dialog open={shouldShowScheduleDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-2xl flex flex-col p-0"
          style={{ maxHeight: '90vh' }}
        >
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Clock className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <DialogTitle>
                  {isEditMode ? '编辑工作流调度' : '创建工作流调度'}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode ? '修改工作流的自动执行计划配置' : '设置工作流的自动执行计划,支持多种调度方式'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {error && (
              <div className="border-destructive/30 bg-destructive/10 mb-4 rounded-lg border p-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <ScheduleForm
              data={formData}
              onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
              cronTemplates={CRON_TEMPLATES}
              intervalUnits={INTERVAL_UNITS}
              showInputsField={!hasInputParams}
            />

            {/* 参数配置按钮 */}
            {hasInputParams && (
              <div className="mt-6 flex items-center justify-between rounded-lg border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  <div>
                    <h3 className="text-sm font-semibold">运行参数</h3>
                    <p className="text-muted-foreground text-xs">配置工作流入口节点的输入参数</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleOpenRunConfig}>
                  配置参数
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '创建调度')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复用 RunConfigDialog 进行参数配置 */}
      {showRunConfig && workflowAst && (
        <RunConfigDialog
          visible={showRunConfig}
          workflow={workflowAst}
          defaultInputs={currentInputs}
          onConfirm={handleRunConfigConfirm}
          onCancel={handleRunConfigCancel}
        />
      )}
    </>
  )
}
