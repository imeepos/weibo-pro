import { Inject, Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow'
import { SmartAstV1, DataItem, MetadataSummary } from '@sker/workflow-ast'
import { Observable, from, of } from 'rxjs'
import { concatMap, mergeMap, catchError, finalize, tap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { StreamingLlmInvoker, StreamChunk } from './services/StreamingLlmInvoker'
import { SmartToolsFactory } from './services/SmartToolsFactory'

interface MessageContent {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

/**
 * SmartAstV1 节点访问器
 * 职责：协调 LLM 和工具，实现智能数据分发
 */
@Injectable()
export class SmartAstV1Visitor {
  constructor(
    @Inject(StreamingLlmInvoker) private streamingLlmInvoker: StreamingLlmInvoker,
    @Inject(SmartToolsFactory) private smartToolsFactory: SmartToolsFactory
  ) {}

  @Handler(SmartAstV1)
  visit(
    ast: SmartAstV1,
    input$: Observable<Record<string, unknown>>,
    ctx: WorkflowGraphAst
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController()

      ast.state = 'running'
      ast.parseStatus = 'analyzing'
      obs.next({ type: 'node_runing', id: ast.id })

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
            })
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消')
          }

          const startTime = Date.now()

          // 分发项收集器
          const dispatchItems: DataItem[] = []

          // 设置分发项回调
          this.smartToolsFactory.setDispatchItemCallback((item: DataItem) => {
            dispatchItems.push(item)

            // 立即发射分发项
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { dispatchItem: item }
            })

            ast.dispatchedItems = dispatchItems.length

            console.log(`[SmartAstV1] 发射分发项: ${item.id} - ${item.summary || '(无描述)'}`)
          })

          try {
            // 创建工具集
            const dataTools = this.smartToolsFactory.createDataTools(
              ast.inputData,
              ast.maxItems,
              ctx,
              ast
            )
            const nodeTools = this.smartToolsFactory.createNodeTools(ctx, ast.id)
            const allTools = [...dataTools, ...nodeTools]

            // 准备 LLM
            const model = useLlmModel({
              model: ast.model,
              temperature: ast.temperature
            }).bindTools(allTools)

            // 构建消息
            const systemPrompt = this.buildSystemPrompt(ast)
            const userPrompt = this.buildUserPrompt(ast)

            const messages: MessageContent[] = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]

            // 调用 LLM
            return await this.executeDispatchLoop(
              ast,
              model,
              messages,
              abortController.signal,
              obs,
              startTime,
              dispatchItems
            )
          } catch (error) {
            ast.parseStatus = 'failed'
            ast.state = 'fail'
            setAstError(ast, error)
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
            throw error
          } finally {
            // 清除回调
            this.smartToolsFactory.clearDispatchItemCallback()
          }
        }),
        mergeMap((events) => from(events)),
        catchError((error) => {
          obs.error(error)
          return of()
        }),
        finalize(() => {
          ast.state = 'success'
          obs.next({ type: 'node_success', id: ast.id })
          obs.complete()
        })
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error: Error) => {
          console.error('[SmartAstV1] 执行失败:', error)
        }
      })

      return () => {
        subscription.unsubscribe()
        abortController.abort()
        obs.complete()
      }
    })
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(ast: SmartAstV1): string {
    return `${ast.systemPrompt}

【可用工具】
- detect_data_structure: 检测输入数据的结构类型
- search_data_content: 在数据中搜索关键词
- extract_data_segment: 提取数据片段
- list_downstream_nodes: 查看可用的下游节点
- create_dispatch_item: 创建分发项并发射到下游

【工作流程】
1. 使用 detect_data_structure 分析输入数据结构
2. 使用 list_downstream_nodes 查看下游节点能力
3. 根据数据结构和用户需求，调用 create_dispatch_item 创建分发项
4. 每次调用 create_dispatch_item 会触发一次 node_emit，下游节点独立执行

【分发原则】
- 每次只分发一个数据项
- 根据 maxItems 限制控制分发数量
- 确保每个数据项可以被下游节点独立处理

【输出格式】
完成分发后，输出 JSON 格式的摘要：
\`\`\`json
{
  "dataType": "数据类型",
  "structure": "结构描述",
  "totalCount": 分发项总数,
  "keyFields": ["关键字段1", "关键字段2"]
}
\`\`\`
`
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(ast: SmartAstV1): string {
    const dataPreview = this.getDataPreview(ast.inputData, 500)

    return `请分析以下数据，并将其拆分为可独立处理的分发项：

【输入数据】
\`\`\`
${dataPreview}
\`\`\`

【最大项数】
${ast.maxItems}

请开始分析...`
  }

  /**
   * 获取数据预览
   */
  private getDataPreview(data: unknown, maxLength: number = 500): string {
    const dataStr = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)

    if (dataStr.length <= maxLength) {
      return dataStr
    }

    return dataStr.slice(0, maxLength) + '\n...(数据已截断)'
  }

  /**
   * 执行分发循环
   */
  private async executeDispatchLoop(
    ast: SmartAstV1,
    model: any,
    messages: MessageContent[],
    signal: AbortSignal,
    obs: any,
    startTime: number,
    dispatchItems: DataItem[]
  ): Promise<NodeEvent[]> {
    const events: NodeEvent[] = []
    let fullOutput = ''

    return new Promise((resolve, reject) => {
      const subscription = this.streamingLlmInvoker.streamWithTools(
        model,
        messages as any,
        signal,
        true,
        []
      ).pipe(
        tap((chunk: StreamChunk) => {
          // 处理流式文本
          if (chunk.type === 'delta' && chunk.delta) {
            fullOutput += chunk.delta
            ast.stdout = fullOutput

            // 发射流式输出事件
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { stdout: chunk.delta }
            })
          }

          // 处理完成
          if (chunk.type === 'complete') {
            ast.analysisDuration = Date.now() - startTime
            ast.allItems = dispatchItems
            ast.totalItems = dispatchItems.length

            // 提取元数据摘要
            const metadataSummary = this.extractMetadataSummary(fullOutput)
            ast.metadataSummary = metadataSummary

            if (metadataSummary) {
              ast.detectedDataType = metadataSummary.dataType
            }

            // 发射最终状态
            events.push({
              type: 'node_emit',
              id: ast.id,
              data: { allItems: dispatchItems }
            })

            events.push({
              type: 'node_emit',
              id: ast.id,
              data: { metadataSummary }
            })

            ast.dispatchComplete = true
            ast.parseStatus = 'completed'

            events.push({
              type: 'node_emit',
              id: ast.id,
              data: { dispatchComplete: true }
            })

            console.log(`[SmartAstV1] 分发完成，共 ${dispatchItems.length} 项，耗时 ${ast.analysisDuration}ms`)
          }
        }),
        catchError((error) => {
          ast.parseStatus = 'failed'
          console.error('[SmartAstV1] 执行失败:', error)
          return of()
        }),
        finalize(() => {
          resolve(events)
        })
      ).subscribe({
        error: (err) => reject(err)
      })
    })
  }

  /**
   * 从响应中提取元数据摘要
   */
  private extractMetadataSummary(rawOutput: string): MetadataSummary | null {
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/) ||
                      rawOutput.match(/\{[\s\S]*?\}/)

    if (!jsonMatch) return null

    try {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])

      // 验证必需字段
      if (parsed.dataType && parsed.structure) {
        return {
          dataType: parsed.dataType,
          totalCount: parsed.totalCount || 0,
          structure: parsed.structure,
          keyFields: parsed.keyFields || []
        }
      }
    } catch {
      // 解析失败，返回 null
    }

    return null
  }
}
