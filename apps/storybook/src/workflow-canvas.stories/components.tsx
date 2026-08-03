import type { ReactNode, RefObject } from 'react'
import type { WorkflowCanvasRef } from '@sker/workflow-ui'
import { Button } from '@sker/ui/components/ui/button'

/**
 * 全屏画布容器
 * 用于大多数 story 的展示容器
 */
export function CanvasShell({ children }: { children: ReactNode }) {
  return <div className="h-screen">{children}</div>
}

/**
 * 带边框的固定高度画布容器
 * 用于禁用控制项 / 纯展示模式
 */
export function BorderedCanvasShell({ children }: { children: ReactNode }) {
  return <div className="h-[600px] border border-border rounded-lg overflow-hidden">{children}</div>
}

/**
 * 自定义样式画布容器
 * 用于展示如何自定义画布样式
 */
export function CustomClassCanvasShell({ children }: { children: ReactNode }) {
  return <div className="h-[600px] rounded-xl overflow-hidden shadow-2xl">{children}</div>
}

/**
 * 命令式 API 控制栏
 * 通过 ref 调用 WorkflowCanvas 暴露的实例方法
 */
export function RefControlsToolbar({
  canvasRef,
}: {
  canvasRef: RefObject<WorkflowCanvasRef | null>
}) {
  const handleFitView = () => {
    canvasRef.current?.fitView()
  }

  const handleZoomIn = () => {
    canvasRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut()
  }

  const handleCenterView = () => {
    canvasRef.current?.centerView()
  }

  const handleSelectAll = () => {
    canvasRef.current?.selectAll()
  }

  const handleExport = () => {
    const json = canvasRef.current?.exportWorkflow()
    console.log('导出的工作流 JSON:', json)
  }

  const handleGetAst = () => {
    const ast = canvasRef.current?.getWorkflowAst()
    console.log('工作流 AST:', ast)
  }

  return (
    <div className="flex gap-2 p-4 border-b bg-background">
      <Button onClick={handleFitView} size="sm">
        适应画布
      </Button>
      <Button onClick={handleZoomIn} size="sm">
        放大
      </Button>
      <Button onClick={handleZoomOut} size="sm">
        缩小
      </Button>
      <Button onClick={handleCenterView} size="sm">
        居中视图
      </Button>
      <Button onClick={handleSelectAll} size="sm">
        全选节点
      </Button>
      <Button onClick={handleExport} size="sm" variant="outline">
        导出工作流
      </Button>
      <Button onClick={handleGetAst} size="sm" variant="outline">
        获取 AST
      </Button>
    </div>
  )
}
