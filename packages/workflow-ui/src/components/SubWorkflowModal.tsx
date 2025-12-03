import React, { useCallback, useEffect, useRef, useState } from 'react'
import { WorkflowGraphAst } from '@sker/workflow'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogClose
} from '@sker/ui/components/ui/dialog'
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
import { XIcon } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { WorkflowCanvas, type WorkflowCanvasRef } from './WorkflowCanvas'

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
  const canvasRef = useRef<WorkflowCanvasRef>(null)
  const [localWorkflowAst, setLocalWorkflowAst] = useState<WorkflowGraphAst>()
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    if (visible && workflowAst) {
      const clonedAst = new WorkflowGraphAst()
      Object.assign(clonedAst, JSON.parse(JSON.stringify(workflowAst)))
      setLocalWorkflowAst(clonedAst)
      setHasChanges(false)
    }
  }, [visible, workflowAst])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!visible) return

      if (event.key === 'Escape') {
        event.preventDefault()
        handleCloseRequest()
      }

      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, localWorkflowAst, parentNodeId, hasChanges])

  const handleWorkflowChange = useCallback((updatedAst: WorkflowGraphAst) => {
    setLocalWorkflowAst(updatedAst)
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!parentNodeId) return

    // 从 canvas ref 获取最新的工作流状态，而不是使用闭包中的旧 localWorkflowAst
    const currentAst = canvasRef.current?.getWorkflowAst()
    if (!currentAst) return

    onSave(parentNodeId, currentAst)
    setHasChanges(false)
  }, [parentNodeId, onSave])

  const handleCloseRequest = useCallback(() => {
    if (hasChanges) {
      setShowConfirmDialog(true)
    } else {
      onClose()
    }
  }, [hasChanges, onClose])

  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false)
    // 关闭前先保存
    if (hasChanges) {
      handleSave()
    }
    onClose()
  }, [hasChanges, handleSave, onClose])

  return (
    <>
      <Dialog
        open={visible}
        onOpenChange={(open: boolean) => !open && handleCloseRequest()}
        modal={false}  // 禁用模态行为，允许与 Dialog 外部元素交互（NodeSelector）
      >
        <DialogPortal>
          {/* 自定义背景遮罩（视觉效果） */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            style={{ pointerEvents: 'none' }}
            aria-hidden="true"
          />

          <DialogContent
            className={cn(
              'fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
              'flex flex-col p-0 bg-background rounded-lg border shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'duration-200'
            )}
            style={{
              width: '100vw',
              maxWidth: `100vw`,
              height: `95vh`,
            }}
          >
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle className="flex items-center gap-3">
                <span>子工作流编辑器</span>
                {localWorkflowAst?.name && (
                  <span className="text-sm text-muted-foreground font-normal">
                    {localWorkflowAst.name}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              {localWorkflowAst ? (
                <WorkflowCanvas
                  ref={canvasRef}
                  workflowAst={localWorkflowAst}
                  title="子工作流"
                  name={localWorkflowAst.name || '未命名子工作流'}
                  onSave={() => {
                    setHasChanges(true)
                    handleSave()
                  }}
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  加载中...
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            <DialogClose
              onClick={handleCloseRequest}
              className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认关闭</AlertDialogTitle>
            <AlertDialogDescription>
              子工作流有未保存的更改，确定要关闭吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}