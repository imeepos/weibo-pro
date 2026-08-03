import { useMemo } from 'react'
import { fromJson, toJson, WorkflowGraphAst } from '@sker/workflow'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'

export interface UseCanvasImperativeApiParams {
  workflow: UseWorkflowReturn
  getViewport: () => { x: number; y: number; zoom: number }
  runWorkflow: (inputs?: Record<string, unknown>) => Promise<unknown>
  cancelWorkflow: () => void
  runNode: (nodeId: string) => Promise<unknown>
  runNodeIsolated: (nodeId: string) => Promise<unknown>
  autoLayout: () => void
  handleFitView: () => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleCenterView: () => void
  handleLocateNode: (nodeId: string) => void
  handleSelectAll: () => void
  deleteSelection: () => void
  copyNodes: () => void
  pasteNodes: (position?: { x: number; y: number }) => void
  showToast: (type: ToastType, title: string, message?: string) => void
}

/**
 * 构建 WorkflowCanvas 的命令式 API 对象
 *
 * 通过 ref 暴露给外部的方法。使用 useMemo 保证对象身份随依赖变化而更新，
 * 与 useImperativeHandle 配合可精确控制触发时机。
 */
export function useCanvasImperativeApi({
  workflow,
  getViewport,
  runWorkflow,
  cancelWorkflow,
  runNode,
  runNodeIsolated,
  autoLayout,
  handleFitView,
  handleZoomIn,
  handleZoomOut,
  handleCenterView,
  handleLocateNode,
  handleSelectAll,
  deleteSelection,
  copyNodes,
  pasteNodes,
  showToast,
}: UseCanvasImperativeApiParams) {
  return useMemo(() => ({
    // 文件操作
    importWorkflow: async (json: string) => {
      try {
        const data = JSON.parse(json)
        const importedWorkflow = fromJson<WorkflowGraphAst>(data.workflow || data)

        Object.assign(workflow.workflowAst, importedWorkflow)
        workflow.syncFromAst()

        if (handleFitView) {
          setTimeout(() => {
            handleFitView()
          }, 100)
        }

        showToast('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
      } catch (error) {
        console.error('导入工作流失败:', error)
        showToast('error', '导入失败', error instanceof Error ? error.message : '未知错误')
        throw error
      }
    },
    exportWorkflow: () => {
      try {
        if (!workflow?.workflowAst) {
          return ''
        }

        const workflowJson = toJson(workflow.workflowAst)
        const exportData = {
          workflow: workflowJson
        }

        return JSON.stringify(exportData, null, 2)
      } catch (error) {
        console.error('导出工作流失败:', error)
        return ''
      }
    },

    // 执行控制
    runWorkflow: async () => {
      await runWorkflow()
    },
    cancelWorkflow: () => {
      cancelWorkflow()
    },
    runNode: async (nodeId: string) => {
      await runNode(nodeId)
    },
    runNodeIsolated: async (nodeId: string) => {
      await runNodeIsolated(nodeId)
    },

    // 视图操作
    autoLayout: (_direction?: 'TB' | 'LR') => {
      // autoLayout 不接受参数，这里忽略参数
      autoLayout()
    },
    fitView: () => {
      handleFitView()
    },
    zoomIn: () => {
      handleZoomIn()
    },
    zoomOut: () => {
      handleZoomOut()
    },
    centerView: () => {
      handleCenterView()
    },
    locateNode: (nodeId: string) => {
      handleLocateNode(nodeId)
    },

    // 节点操作
    selectAll: () => {
      handleSelectAll()
    },
    deleteSelection: () => {
      deleteSelection()
    },
    copyNodes: () => {
      copyNodes()
    },
    pasteNodes: () => {
      pasteNodes()
    },

    // 数据访问
    getWorkflowAst: () => {
      workflow.workflowAst.viewport = getViewport()
      return workflow.workflowAst
    },
    getSelectedNodes: () => {
      return workflow.nodes.filter((n) => n.selected).map((n) => n.data)
    },
  }), [
    workflow,
    getViewport,
    runWorkflow,
    cancelWorkflow,
    runNode,
    runNodeIsolated,
    autoLayout,
    handleFitView,
    handleZoomIn,
    handleZoomOut,
    handleCenterView,
    handleLocateNode,
    handleSelectAll,
    deleteSelection,
    copyNodes,
    pasteNodes,
    showToast,
  ])
}
