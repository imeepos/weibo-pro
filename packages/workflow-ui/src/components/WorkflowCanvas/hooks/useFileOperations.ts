import { useCallback } from 'react'
import { toJson, fromJson, WorkflowGraphAst } from '@sker/workflow'
import { validateEdgesDetailed } from '../../../utils/edgeValidator'
import { astToFlowEdges } from '../../../adapters/ast-to-flow'
import { regenerateIds, validateWorkflowData } from './file-operations-utils'

export interface FileOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onGetViewport?: () => { x: number; y: number; zoom: number }
  onFitView?: () => void
}

export const useFileOperations = (workflow: any, options: FileOperationsOptions = {}) => {
  const { onShowToast, onGetViewport, onFitView } = options

  /**
   * 导出工作流为 JSON 文件
   *
   * 优雅设计：
   * - 先保存 viewport 状态，确保导出包含完整的视图信息
   * - 使用工作流名称和时间戳生成文件名
   * - 通过 Blob 和 URL.createObjectURL 触发浏览器下载
   * - 自动清理临时 URL，避免内存泄漏
   */
  const exportWorkflow = useCallback(() => {
    try {
      if (!workflow?.workflowAst) {
        onShowToast?.('error', '导出失败', '工作流数据不存在')
        return
      }

      // 保存当前 viewport 状态
      if (onGetViewport) {
        workflow.workflowAst.viewport = onGetViewport()
      }

      // 序列化工作流数据
      const workflowJson = toJson(workflow.workflowAst)
      const exportData = {
        workflow: workflowJson
      }

      // 创建 Blob 并触发下载
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `workflow-${workflow.workflowAst.name || 'untitled'}-${Date.now()}.json`

      link.href = url
      link.download = filename
      link.click()

      // 清理临时 URL
      URL.revokeObjectURL(url)

      onShowToast?.('success', '导出成功', `工作流已导出为 ${filename}`)
    } catch (error) {
      console.error('导出工作流失败:', error)
      onShowToast?.('error', '导出失败', error instanceof Error ? error.message : '未知错误')
    }
  }, [workflow, onGetViewport, onShowToast])

  /**
   * 从文件导入工作流（通用逻辑）
   *
   * 优雅设计：
   * - 统一处理按钮导入和拖拽导入
   * - 避免代码重复
   * - 便于维护和扩展
   */
  const processImportFile = useCallback(async (file: File, _isCanvasEmpty: boolean) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // 完整验证数据格式
      const validation = validateWorkflowData(data)
      if (!validation.valid) {
        const errorMessage = validation.errors.join('\n• ')
        throw new Error(`工作流验证失败：\n\n• ${errorMessage}`)
      }

      // 反序列化工作流
      let importedWorkflow = fromJson<WorkflowGraphAst>(data.workflow)

      // 重新生成所有 ID，避免与现有工作流冲突
      importedWorkflow = regenerateIds(importedWorkflow)

      // 验证和清理边
      // 注意：需要先将 IEdge 转换为 React Flow Edge 格式才能验证
      const flowEdges = astToFlowEdges(importedWorkflow)
      const edgeValidation = validateEdgesDetailed(
        flowEdges as any[],
        importedWorkflow.nodes
      )

      if (edgeValidation.invalidEdges.length > 0) {
        const invalidCount = edgeValidation.invalidEdges.length
        const errorDetails = edgeValidation.invalidEdges
          .slice(0, 3)
          .map(({ edge, errors }) => `边 ${edge.source} → ${edge.target}: ${errors[0]}`)
          .join('\n• ')

        console.warn('导入工作流时发现非法边:', edgeValidation.invalidEdges)

        onShowToast?.(
          'info',
          `已清理 ${invalidCount} 条非法连线`,
          invalidCount <= 3 ? errorDetails : `${errorDetails}\n...还有 ${invalidCount - 3} 条`
        )

        // 将有效的边转换回 IEdge 格式
        const validIEdges = (edgeValidation.validEdges as any[]).map(flowEdge => ({
          id: flowEdge.id,
          from: flowEdge.source,
          to: flowEdge.target,
          fromProperty: flowEdge.sourceHandle,
          toProperty: flowEdge.targetHandle,
          weight: flowEdge.data?.weight,
          condition: flowEdge.data?.condition
        }))
        importedWorkflow.edges = validIEdges
      }

      // 导入工作流（已重新生成 ID，不会覆盖现有工作流）
      workflow.replaceWorkflow(importedWorkflow)

      // 自动适应视图
      if (onFitView) {
        setTimeout(() => {
          onFitView()
        }, 100)
      }

      onShowToast?.('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
      return { success: true, replaced: false }
    } catch (error) {
      console.error('导入工作流失败:', error)
      onShowToast?.('error', '导入失败', error instanceof Error ? error.message : '文件格式不正确')
      return { success: false, replaced: false, error }
    }
  }, [workflow, onFitView, onShowToast])

  /**
   * 导入工作流从 JSON 文件（按钮触发）
   *
   * 优雅设计：
   * - 使用隐藏的 input 元素触发文件选择
   * - 委托给 processImportFile 处理具体逻辑
   */
  const importWorkflow = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // 直接导入，无需检查画布是否为空（因为会重新生成 ID）
        await processImportFile(file, false)
      }
    }

    input.click()
  }, [processImportFile])

  return {
    validateWorkflowData,
    exportWorkflow,
    importWorkflow,
    processImportFile
  }
}
