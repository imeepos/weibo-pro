import React, { useCallback, useEffect, useState } from 'react'
import { X, Save } from 'lucide-react'
import { WorkflowGraphAst } from '@sker/workflow'
import { WorkflowCanvas } from './WorkflowCanvas'
import { cn } from '../utils/cn'

export interface SubWorkflowModalProps {
  /** 是否可见 */
  visible: boolean
  /** 子工作流 AST 实例 */
  workflowAst?: WorkflowGraphAst
  /** 父节点 ID */
  parentNodeId?: string
  /** 关闭弹框回调 */
  onClose: () => void
  /** 保存子工作流回调 */
  onSave: (parentNodeId: string, updatedAst: WorkflowGraphAst) => void
}

export function SubWorkflowModal({
  visible,
  workflowAst,
  parentNodeId,
  onClose,
  onSave,
}: SubWorkflowModalProps) {
  const [localWorkflowAst, setLocalWorkflowAst] = useState<WorkflowGraphAst>()
  const [hasChanges, setHasChanges] = useState(false)

  // 初始化本地工作流状态
  useEffect(() => {
    if (visible && workflowAst) {
      // 深拷贝工作流 AST，避免直接修改父级状态
      const clonedAst = new WorkflowGraphAst()
      Object.assign(clonedAst, JSON.parse(JSON.stringify(workflowAst)))
      setLocalWorkflowAst(clonedAst)
      setHasChanges(false)
    }
  }, [visible, workflowAst])

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!visible) return

      // ESC 键关闭弹框
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
      }

      // Ctrl+S 保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, localWorkflowAst, parentNodeId])

  // 处理工作流变化
  const handleWorkflowChange = useCallback((updatedAst: WorkflowGraphAst) => {
    setLocalWorkflowAst(updatedAst)
    setHasChanges(true)
  }, [])

  // 保存子工作流
  const handleSave = useCallback(() => {
    if (!localWorkflowAst || !parentNodeId) return

    try {
      onSave(parentNodeId, localWorkflowAst)
      setHasChanges(false)
      console.log('子工作流保存成功', {
        parentNodeId,
        nodeCount: localWorkflowAst.nodes.length,
        edgeCount: localWorkflowAst.edges.length
      })
    } catch (error) {
      console.error('保存子工作流失败', error)
    }
  }, [localWorkflowAst, parentNodeId, onSave])

  // 关闭弹框
  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        '子工作流有未保存的更改，确定要关闭吗？'
      )
      if (!confirmClose) return
    }
    onClose()
  }, [hasChanges, onClose])

  // 阻止背景点击关闭
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col w-full h-full max-w-[95vw] max-h-[95vh] bg-[#111318] rounded-xl border border-[#282e39] shadow-2xl"
        onClick={handleBackdropClick}
      >
        {/* 弹框头部 */}
        <header className="flex items-center justify-between border-b border-[#282e39] bg-[#111318] px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              子工作流编辑器
            </h2>
            {localWorkflowAst?.name && (
              <span className="text-sm text-slate-400">
                {localWorkflowAst.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 保存按钮 */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                hasChanges
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" />
              <span>保存</span>
            </button>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* 弹框内容 */}
        <div className="flex-1 overflow-hidden">
          {localWorkflowAst ? (
            <WorkflowCanvas
              workflowAst={localWorkflowAst}
              title="子工作流"
              name={localWorkflowAst.name || '未命名子工作流'}
              onSave={() => handleWorkflowChange(localWorkflowAst)}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              加载中...
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        <footer className="flex items-center justify-between border-t border-[#282e39] bg-[#111318] px-6 py-3 text-sm text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              节点: {localWorkflowAst?.nodes.length || 0}
            </span>
            <span>
              边: {localWorkflowAst?.edges.length || 0}
            </span>
            {hasChanges && (
              <span className="text-yellow-400">
                • 有未保存的更改
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span>ESC 关闭</span>
            <span>Ctrl+S 保存</span>
          </div>
        </footer>
      </div>
    </div>
  )
}