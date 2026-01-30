import { useCallback } from 'react'
import { toJson, fromJson, WorkflowGraphAst, INode, IEdge, generateId } from '@sker/workflow'
import { getAllNodeTypes } from '../../../adapters'
import { validateEdgesDetailed } from '../../../utils/edgeValidator'
import { astToFlowEdges } from '../../../adapters/ast-to-flow'

export interface FileOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onGetViewport?: () => { x: number; y: number; zoom: number }
  onFitView?: () => void
}

export const useFileOperations = (workflow: any, options: FileOperationsOptions = {}) => {
  const { onShowToast, onGetViewport, onFitView } = options

  /**
   * 重新生成节点和边的 ID（但保持工作流 ID 不变）
   *
   * 这确保导入的节点不会与现有节点产生 ID 冲突，
   * 但工作流本身的 code 保持不变，避免覆盖原工作流
   */
  const regenerateIds = useCallback((ast: WorkflowGraphAst): WorkflowGraphAst => {
    // 创建一个 ID 映射表，用于更新边的引用
    const idMap = new Map<string, string>()

    // ⚠️ 不重新生成工作流 ID，保持当前工作流的 code
    // ast.id = generateId() // 删除这行
    idMap.clear()

    // 递归处理节点（包括分组内的节点）
    const processNodes = (nodes: INode[]): INode[] => {
      return nodes.map(node => {
        // 生成新的节点 ID
        const oldId = node.id
        const newId = generateId()
        idMap.set(oldId, newId)

        // 更新节点 ID
        node.id = newId

        // 如果是分组节点，递归处理子节点
        if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
          ;(node as any).nodes = processNodes((node as any).nodes)
        }

        return node
      })
    }

    // 处理所有节点
    ast.nodes = processNodes(ast.nodes)

    // 更新边的 ID 和节点引用
    const processEdges = (edges: IEdge[]): IEdge[] => {
      return edges.map(edge => {
        // 生成新的边 ID
        edge.id = generateId()

        // 更新边的源节点和目标节点引用
        if (edge.from && idMap.has(edge.from)) {
          edge.from = idMap.get(edge.from)!
        }
        if (edge.to && idMap.has(edge.to)) {
          edge.to = idMap.get(edge.to)!
        }

        return edge
      })
    }

    // 处理所有边
    ast.edges = processEdges(ast.edges)

    // 更新入口和结束节点引用
    if (ast.entryNodeIds) {
      ast.entryNodeIds = ast.entryNodeIds.map(id => idMap.get(id) || id)
    }
    if (ast.endNodeIds) {
      ast.endNodeIds = ast.endNodeIds.map(id => idMap.get(id) || id)
    }

    return ast
  }, [])

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
  }, [workflow, onFitView, onShowToast, validateWorkflowData, regenerateIds])

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
  }, [workflow, processImportFile])

  return {
    validateWorkflowData,
    exportWorkflow,
    importWorkflow,
    processImportFile
  }
}