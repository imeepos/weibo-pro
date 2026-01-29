import { useCallback } from 'react'
import { toJson, fromJson, WorkflowGraphAst, INode, IEdge } from '@sker/workflow'
import { getAllNodeTypes } from '../../../adapters'
import { validateEdgesDetailed } from '../../../utils/edgeValidator'

export interface FileOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onGetViewport?: () => { x: number; y: number; zoom: number }
  onFitView?: () => void
}

export const useFileOperations = (workflow: any, options: FileOperationsOptions = {}) => {
  const { onShowToast, onGetViewport, onFitView } = options

  /**
   * 验证工作流数据的完整性
   *
   * 优雅设计：
   * - 分层验证：格式 → 节点类型 → 边完整性
   * - 详细的错误信息，帮助用户定位问题
   * - 返回 { valid, errors } 结构，便于批量展示错误
   */
  const validateWorkflowData = useCallback((data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 1. 基础格式验证
    if (!data || typeof data !== 'object') {
      errors.push('无效的数据格式')
      return { valid: false, errors }
    }

    if (!data.workflow) {
      errors.push('缺少 workflow 字段')
      return { valid: false, errors }
    }

    const workflowData = data.workflow

    // 2. 工作流结构验证
    if (!workflowData.type || workflowData.type !== 'WorkflowGraphAst') {
      errors.push(`无效的工作流类型: ${workflowData.type || '未指定'}`)
    }

    if (!Array.isArray(workflowData.nodes)) {
      errors.push('nodes 字段必须是数组')
    }

    if (!Array.isArray(workflowData.edges)) {
      errors.push('edges 字段必须是数组')
    }

    // 如果基础结构有问题，直接返回
    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // 3. 节点类型验证
    const registeredNodeTypes = getAllNodeTypes()
    const nodeTypeNames = new Set(registeredNodeTypes.map((type: any) => type.name))
    const nodeIds = new Set<string>()

    workflowData.nodes.forEach((node: INode, index: number) => {
      // 收集节点 ID
      if (node.id) {
        nodeIds.add(node.id)
      } else {
        errors.push(`节点 #${index + 1} 缺少 id 字段`)
      }

      // 检查节点类型是否已注册
      if (!node.type) {
        errors.push(`节点 #${index + 1} (id: ${node.id || 'unknown'}) 缺少 type 字段`)
      } else if (!nodeTypeNames.has(node.type)) {
        errors.push(
          `节点 #${index + 1} (id: ${node.id}) 的类型 "${node.type}" 未注册。` +
          `请确保所有必需的节点类型已安装。`
        )
      }
    })

    // 4. 边完整性验证
    workflowData.edges.forEach((edge: any, index: number) => {
      if (!edge.from) {
        errors.push(`边 #${index + 1} 缺少 from 字段`)
      } else if (!nodeIds.has(edge.from)) {
        errors.push(`边 #${index + 1} 的源节点 "${edge.from}" 不存在`)
      }

      if (!edge.to) {
        errors.push(`边 #${index + 1} 缺少 to 字段`)
      } else if (!nodeIds.has(edge.to)) {
        errors.push(`边 #${index + 1} 的目标节点 "${edge.to}" 不存在`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

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
  const processImportFile = useCallback(async (file: File, isCanvasEmpty: boolean) => {
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
      const importedWorkflow = fromJson<WorkflowGraphAst>(data.workflow)

      // 验证和清理边
      const edgesArray = Array.isArray(importedWorkflow.edges) ? importedWorkflow.edges : []
      const nodesArray = Array.isArray(importedWorkflow.nodes) ? importedWorkflow.nodes : []

      const edgeValidation = validateEdgesDetailed(
        edgesArray as any[],
        nodesArray
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

        importedWorkflow.edges = edgeValidation.validEdges as any
      }

      // 智能检测：画布为空直接导入，否则显示确认对话框
      if (isCanvasEmpty) {
        // 直接替换当前工作流
        Object.assign(workflow.workflowAst, importedWorkflow)
        workflow.syncFromAst()

        // 自动适应视图
        if (onFitView) {
          setTimeout(() => {
            onFitView()
          }, 100)
        }

        onShowToast?.('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
        return { success: true, replaced: false }
      } else {
        // 画布有内容，返回需要确认的信息
        return {
          success: false,
          replaced: false,
          needsConfirmation: true,
          importedWorkflow
        }
      }
    } catch (error) {
      console.error('导入工作流失败:', error)
      onShowToast?.('error', '导入失败', error instanceof Error ? error.message : '文件格式不正确')
      return { success: false, replaced: false, error }
    }
  }, [workflow, onFitView, onShowToast, validateWorkflowData])

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
        const isCanvasEmpty = workflow.nodes.length === 0
        const result = await processImportFile(file, isCanvasEmpty)

        if (result.needsConfirmation && result.importedWorkflow) {
          // 画布有内容，显示确认对话框
          const confirmReplace = window.confirm(
            '当前画布已有内容。\n\n' +
            '• 确定：覆盖当前工作流\n' +
            '• 取消：取消导入'
          )

          if (confirmReplace) {
            Object.assign(workflow.workflowAst, result.importedWorkflow)
            workflow.syncFromAst()

            if (onFitView) {
              setTimeout(() => {
                onFitView()
              }, 100)
            }

            onShowToast?.('success', '导入成功', `已导入工作流 "${result.importedWorkflow.name || '未命名'}"`)
          }
        }
      }
    }

    input.click()
  }, [workflow, processImportFile, onFitView, onShowToast])

  return {
    validateWorkflowData,
    exportWorkflow,
    importWorkflow,
    processImportFile
  }
}