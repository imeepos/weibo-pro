import { Injectable } from '@sker/core'
import { WorkflowGraphAst, INode, getEdgesByNode, findNodeType, getToolMethods } from '@sker/workflow'
import { root } from '@sker/core'
import { SmartAstV1, DataItem } from '@sker/workflow-ast'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { StructuredToolInterface } from '@langchain/core/tools'

/**
 * SmartAstV1 工具工厂
 * 职责：创建 LangChain 工具（数据结构检测、内容搜索、节点查询、分发项创建）
 */
@Injectable()
export class SmartToolsFactory {
  private dispatchItemCallback?: (item: DataItem) => void

  /**
   * 设置分发项回调
   */
  setDispatchItemCallback(callback: (item: DataItem) => void): void {
    this.dispatchItemCallback = callback
  }

  /**
   * 清除回调
   */
  clearDispatchItemCallback(): void {
    this.dispatchItemCallback = undefined
  }

  /**
   * 创建数据解析和分发工具
   */
  createDataTools(
    inputData: unknown,
    maxItems: number,
    ctx: WorkflowGraphAst,
    ast: SmartAstV1
  ): StructuredToolInterface[] {
    return [
      this.createDetectStructureTool(inputData),
      this.createSearchContentTool(inputData),
      this.createExtractSegmentTool(inputData),
      this.createListDownstreamNodesTool(ctx, ast.id),
      this.createCreateDispatchItemTool(maxItems)
    ]
  }

  /**
   * 工具1: 检测数据结构
   */
  private createDetectStructureTool(inputData: unknown): StructuredToolInterface {
    return tool(
      async () => {
        const analysis = this.analyzeDataStructure(inputData)
        return JSON.stringify(analysis, null, 2)
      },
      {
        name: 'detect_data_structure',
        description: '检测输入数据的结构类型（字符串/JSON/数组/对象），返回数据类型、字段列表、样本数据',
        schema: z.object({})
      }
    )
  }

  /**
   * 工具2: 搜索数据内容
   */
  private createSearchContentTool(inputData: unknown): StructuredToolInterface {
    return tool(
      async ({ pattern, caseSensitive }: { pattern: string; caseSensitive?: boolean }) => {
        const results = this.searchInData(inputData, pattern, caseSensitive)
        return JSON.stringify(results, null, 2)
      },
      {
        name: 'search_data_content',
        description: '在数据中搜索关键词或模式，返回匹配的位置和上下文',
        schema: z.object({
          pattern: z.string().describe('搜索模式（支持字符串或正则表达式）'),
          caseSensitive: z.boolean().optional().describe('是否区分大小写，默认 false')
        })
      }
    )
  }

  /**
   * 工具3: 提取数据片段
   */
  private createExtractSegmentTool(inputData: unknown): StructuredToolInterface {
    return tool(
      async ({ start, end }: { start: number; end: number }) => {
        const segment = this.extractSegment(inputData, start, end)
        return JSON.stringify({
          start,
          end,
          length: typeof segment === 'string' || Array.isArray(segment) ? segment.length : 0,
          content: segment
        }, null, 2)
      },
      {
        name: 'extract_data_segment',
        description: '提取数据的指定片段（用于分段处理大文本或数组）',
        schema: z.object({
          start: z.number().describe('起始位置（索引）'),
          end: z.number().describe('结束位置（索引）')
        })
      }
    )
  }

  /**
   * 工具4: 列出下游节点
   */
  private createListDownstreamNodesTool(ctx: WorkflowGraphAst, currentNodeId: string): StructuredToolInterface {
    return tool(
      async () => {
        const downstreamNodes = this.analyzeDownstreamNodes(ctx, currentNodeId)
        return JSON.stringify(downstreamNodes, null, 2)
      },
      {
        name: 'list_downstream_nodes',
        description: '列出所有可用的下游节点及其能力描述（节点标题、简介、输入端口），帮助决定将数据分发给哪个节点',
        schema: z.object({})
      }
    )
  }

  /**
   * 工具5: 创建分发项（核心工具，触发 node_emit）
   */
  private createCreateDispatchItemTool(maxItems: number): StructuredToolInterface {
    return tool(
      async ({ id, data, metadata, summary }: {
        id?: string
        data: unknown
        metadata?: Record<string, unknown>
        summary?: string
      }) => {
        const dataItem: DataItem = {
          id: id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          data,
          metadata: metadata || {},
          summary: summary || ''
        }

        // 触发回调（如果有）
        if (this.dispatchItemCallback) {
          this.dispatchItemCallback(dataItem)
        }

        return JSON.stringify({
          success: true,
          item: dataItem,
          message: `分发项 ${dataItem.id} 创建成功，准备发射到下游节点`
        }, null, 2)
      },
      {
        name: 'create_dispatch_item',
        description: `创建一个分发项并触发发射到下游节点。

⚠️ 使用场景:
- 将输入数据拆分为多个独立处理的项
- 每个项将单独触发一次 node_emit 事件
- 下游节点会对每个项独立执行

⚠️ 使用约束:
- 每次调用创建一个分发项
- data 字段必填，可以是任意类型
- id 可选，不提供时自动生成
- 建议提供 summary 简要描述该项内容`,
        schema: z.object({
          id: z.string().optional().describe('唯一标识（可选，自动生成）'),
          data: z.any().describe('数据内容（必填，可以是任意类型）'),
          metadata: z.record(z.string(), z.any()).optional().describe('元数据（键值对，可选）'),
          summary: z.string().optional().describe('简短描述（用于日志和调试）')
        })
      }
    )
  }

  /**
   * 分析数据结构
   */
  private analyzeDataStructure(data: unknown) {
    if (data === null || data === undefined) {
      return { type: 'null', description: '空值' }
    }

    if (typeof data === 'string') {
      return {
        type: 'string',
        length: data.length,
        encoding: 'utf-8',
        preview: data.slice(0, 200),
        formatHint: this.detectStringFormat(data)
      }
    }

    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        sampleTypes: data.slice(0, 5).map(item => typeof item),
        preview: data.slice(0, 3)
      }
    }

    if (typeof data === 'object') {
      return {
        type: 'object',
        keys: Object.keys(data),
        fieldCount: Object.keys(data).length,
        preview: data
      }
    }

    return {
      type: typeof data,
      value: data
    }
  }

  /**
   * 检测字符串格式
   */
  private detectStringFormat(str: string): string {
    const trimmed = str.trim()
    if (trimmed.startsWith('#') || trimmed.startsWith('##')) return 'markdown'
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
    if (trimmed.includes('\t') || (trimmed.match(/,/g) || []).length > 3) return 'table'
    return 'plain_text'
  }

  /**
   * 在数据中搜索
   */
  private searchInData(
    data: unknown,
    pattern: string,
    caseSensitive: boolean = false
  ) {
    const results: Array<{
      path: string
      match: string
      context?: string
    }> = []

    const searchValue = (value: unknown, currentPath: string = 'root') => {
      if (typeof value === 'string') {
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
        const matches = Array.from(value.matchAll(regex))

        for (const match of matches) {
          results.push({
            path: currentPath,
            match: match[0],
            context: value.slice(
              Math.max(0, match.index - 50),
              Math.min(value.length, match.index + match[0].length + 50)
            )
          })
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) =>
          searchValue(item, `${currentPath}[${index}]`)
        )
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) =>
          searchValue(val, `${currentPath}.${key}`)
        )
      }
    }

    searchValue(data)

    return {
      pattern,
      caseSensitive,
      matchCount: results.length,
      matches: results.slice(0, 20)
    }
  }

  /**
   * 提取数据片段
   */
  private extractSegment(data: unknown, start: number, end: number) {
    if (typeof data === 'string') {
      return data.slice(start, end)
    }

    if (Array.isArray(data)) {
      return data.slice(start, end)
    }

    return { error: '不支持的数据类型，仅支持字符串或数组' }
  }

  /**
   * 分析下游节点
   */
  private analyzeDownstreamNodes(ctx: WorkflowGraphAst, currentNodeId: string) {
    const outEdges = getEdgesByNode(ctx.edges || [], currentNodeId, 'out')

    return outEdges.map(edge => {
      const targetNode = ctx.nodes.find(n => n.id === edge.to)
      if (!targetNode) return null

      const inputMetadata = targetNode.metadata?.inputs || []

      return {
        id: targetNode.id,
        type: targetNode.type,
        name: targetNode.name,
        description: targetNode.description,
        inputProperties: inputMetadata.map((input: any) => ({
          property: input.property,
          title: input.title,
          type: input.type
        }))
      }
    }).filter(node => node !== null)
  }

  /**
   * 创建节点工具（允许 LLM 调用工作流中的其他节点）
   */
  createNodeTools(ctx: WorkflowGraphAst, currentAstId: string): StructuredToolInterface[] {
    const toolNodes = this.buildToolNodes(ctx, currentAstId)
    const tools: StructuredToolInterface[] = []

    for (const node of toolNodes) {
      const nodeTools = this.createNodeTool(node)
      tools.push(...nodeTools)
    }

    return tools
  }

  /**
   * 构建可用的工具节点列表
   */
  private buildToolNodes(ctx: WorkflowGraphAst, currentAstId: string): INode[] {
    const toolNodeIds = new Set(ctx.toolNodeIds || [])
    const currentNodeIndex = ctx.nodes.findIndex(n => n.id === currentAstId)

    return ctx.nodes.filter((node, index) => {
      if (toolNodeIds.has(node.id)) return true
      if (index < currentNodeIndex && node.state === 'success') return true
      return false
    })
  }

  /**
   * 为单个节点创建工具
   */
  private createNodeTool(node: INode): StructuredToolInterface[] {
    const nodeType = findNodeType(node.type)
    if (!nodeType) return []

    const toolMethods = getToolMethods(nodeType)
    if (toolMethods.length === 0) return []

    const tools: StructuredToolInterface[] = []

    for (const toolMethod of toolMethods) {
      try {
        const toolInstance = root.get(toolMethod.target)
        const methodName = String(toolMethod.property)

        const langchainTool = tool(
          async () => {
            const result = toolInstance[methodName](node)
            return typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          },
          {
            name: `get_${node.type}_${node.id}_${methodName}`,
            description: `获取节点"${node.name || node.id}"的${methodName}内容${node.description ? `（${node.description}）` : ''}`,
            schema: z.object({})
          }
        )

        tools.push(langchainTool)
      } catch (error) {
        console.error(`[SmartToolsFactory] 创建节点 ${node.id} 的工具失败:`, error)
      }
    }

    return tools
  }
}
