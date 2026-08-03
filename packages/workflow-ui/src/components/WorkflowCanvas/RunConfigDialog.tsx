'use client'

import React, { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import { EmptyState } from '@sker/ui/components/ui'
import { useRunConfigDialog } from './useRunConfigDialog'
import { RunConfigDialogHeader } from './RunConfigDialogHeader'
import { RunConfigNodeSection } from './RunConfigNodeSection'
import { RunConfigDialogFooter } from './RunConfigDialogFooter'
import { groupFieldsByNode } from './run-config-dialog.utils'

export type { RunConfigDialogProps } from './run-config-dialog.types'
import type { RunConfigDialogProps } from './run-config-dialog.types'

/**
 * 运行配置对话框
 *
 * 优雅设计：
 * - 优先使用 entryNodeIds 确定入口节点，为空时回退到无入边节点
 * - 只渲染带有 @Input 装饰器的属性（通过元数据系统）
 * - 智能推断字段类型（优先使用 @Input 的 type）
 * - 使用 WorkflowFormField 构建统一表单
 * - 保留节点的默认值
 * - 每次打开时获取工作流最新状态
 *
 * 结构：状态与派生数据由 useRunConfigDialog 管理，UI 由子组件组合
 */
function RunConfigDialog({
  visible,
  workflow,
  defaultInputs = {},
  onConfirm,
  onCancel,
}: RunConfigDialogProps) {
  const {
    inputs,
    inputFields,
    settingRenderers,
    handleInputChange,
    getPropChangeWrapper,
    resetState,
  } = useRunConfigDialog(workflow, defaultInputs, visible)

  const handleConfirm = useCallback(() => {
    onConfirm(inputs)
  }, [inputs, onConfirm])

  const handleCancel = useCallback(() => {
    // 清空输入状态，避免下次打开时残留旧数据
    resetState()
    onCancel()
  }, [resetState, onCancel])

  if (!visible) return null

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-2xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <RunConfigDialogHeader onCancel={handleCancel} />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {inputFields.length === 0 ? (
            <EmptyState
              icon={Settings}
              description="此工作流不需要配置输入参数"
            />
          ) : (
            <div className="space-y-6">
              {/* 按节点分组显示 */}
              {groupFieldsByNode(inputFields).map(({ nodeId, nodeName, fields }) => {
                const customSetting = settingRenderers.get(nodeId)
                const node = workflow?.nodes.find((n: any) => n.id === nodeId)
                const propChangeWrapper = getPropChangeWrapper(nodeId, node)

                return (
                  <RunConfigNodeSection
                    key={nodeId}
                    nodeName={nodeName}
                    fields={fields}
                    node={node}
                    settingRenderer={customSetting}
                    propChangeWrapper={propChangeWrapper}
                    onInputChange={handleInputChange}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <RunConfigDialogFooter onCancel={handleCancel} onConfirm={handleConfirm} />
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

// 使用 React.memo 优化，只在 props 变化时重新渲染
const MemoizedRunConfigDialog = React.memo(RunConfigDialog, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.workflow === nextProps.workflow &&
    prevProps.defaultInputs === nextProps.defaultInputs &&
    prevProps.onConfirm === nextProps.onConfirm &&
    prevProps.onCancel === nextProps.onCancel
  )
})

// 同时提供命名导出和默认导出
export { MemoizedRunConfigDialog as RunConfigDialog }
export default MemoizedRunConfigDialog
