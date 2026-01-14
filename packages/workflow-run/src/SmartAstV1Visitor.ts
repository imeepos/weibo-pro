import { Inject, Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError, WorkflowGraphAst, getEdgesByNode } from '@sker/workflow'
import { SmartAstV1 } from '@sker/workflow-ast'
import { Observable, from, of } from 'rxjs'
import { concatMap, mergeMap, catchError, finalize, tap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { StreamingLlmInvoker, StreamChunk } from './services/StreamingLlmInvoker'
import { SmartToolsFactory } from './services/SmartToolsFactory'
import { StructuredToolInterface } from '@langchain/core/tools'

interface MessageContent {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

interface InputContext {
  property: string
  title: string
  description: string
  content: unknown
}

interface OutputContext {
  property: string
  title: string
  description: string
  type?: string
  defaultValue?: unknown
}

/**
 * SmartAstV1 节点访问器
 *
 * 核心逻辑：
 * 1. 输入上下文：(title, description, content) 三元组
 * 2. 输出上下文：(title, description, type) 定义
 * 3. LLM 根据上下文生成数据，调用 dispatch 分发
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
      obs.next({ type: 'node_runing', id: ast.id })

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消')
          }

          const inputContexts = this.buildInputContexts(ast, inputData, ctx)
          const outputContexts = this.buildOutputContexts(ast, ctx)

          this.smartToolsFactory.setDispatchCallback((outputPort: string, data: unknown) => {
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { [outputPort]: data }
            })
            console.log(`[SmartAstV1] 分发到 ${outputPort}:`, typeof data === 'object' ? JSON.stringify(data).slice(0, 100) : data)
          })

          try {
            const tools = this.smartToolsFactory.createTools(outputContexts)

            const model = useLlmModel({
              model: ast.model,
              temperature: ast.temperature
            }).bindTools(tools)

            const messages: MessageContent[] = [
              { role: 'system', content: this.buildSystemPrompt(inputContexts, outputContexts) },
              { role: 'user', content: this.buildUserPrompt(inputContexts, outputContexts) }
            ]

            return await this.executeDispatchLoop(ast, model, messages, tools, abortController.signal, obs)
          } catch (error) {
            ast.state = 'fail'
            setAstError(ast, error)
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
            throw error
          } finally {
            this.smartToolsFactory.clearDispatchCallback()
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

  private buildInputContexts(ast: SmartAstV1, inputData: Record<string, unknown>, ctx: WorkflowGraphAst): InputContext[] {
    const contexts: InputContext[] = []
    const inEdges = getEdgesByNode(ctx.edges || [], ast.id, 'in')

    for (const edge of inEdges) {
      const inputMeta = ast.metadata?.inputs?.find((i: any) => i.property === edge.toPort)
      if (!inputMeta) continue

      contexts.push({
        property: edge.toPort,
        title: inputMeta.title || edge.toPort,
        description: inputMeta.description || '',
        content: inputData[edge.toPort]
      })
    }

    return contexts
  }

  private buildOutputContexts(ast: SmartAstV1, ctx: WorkflowGraphAst): OutputContext[] {
    const contexts: OutputContext[] = []
    const outEdges = getEdgesByNode(ctx.edges || [], ast.id, 'out')

    for (const edge of outEdges) {
      const outputMeta = ast.metadata?.outputs?.find((o: any) => o.property === edge.fromPort)
      if (!outputMeta || outputMeta.property === 'dispatchComplete') continue

      contexts.push({
        property: edge.fromPort,
        title: outputMeta.title || edge.fromPort,
        description: outputMeta.description || '',
        type: outputMeta.type,
        defaultValue: outputMeta.defaultValue
      })
    }

    return contexts
  }

  private buildSystemPrompt(inputContexts: InputContext[], outputContexts: OutputContext[]): string {
    const inputList = inputContexts.map(i =>
      `- ${i.property}:\n  标题: ${i.title}\n  描述: ${i.description || '(无)'}`
    ).join('\n')

    const outputList = outputContexts.map(o =>
      `- ${o.property}:\n  标题: ${o.title}\n  描述: ${o.description || '(无)'}\n  类型: ${o.type || 'any'}`
    ).join('\n')

    return `你是智能数据分发控制决策中心。根据输入数据的要求，为每个输出端口生成合适的内容。

【输入端口上下文】
${inputList || '(无)'}

【输出端口上下文】
${outputList || '(无)'}

【可用工具】
- dispatch(outputPort, data): 将数据分发到指定输出端口

【工作流程】
1. 分析输入数据
2. 根据输出端口的 title、description、type 生成合适的数据
3. 调用 dispatch 分发数据

【重要】
- 输出数据类型应与输出端口的 type 匹配
- 输出数据内容应符合输出端口的 description
`
  }

  private buildUserPrompt(inputContexts: InputContext[], outputContexts: OutputContext[]): string {
    const inputList = inputContexts.map(i => {
      const preview = this.preview(i.content, 300)
      return `- **${i.property}** (${i.title}):\n  ${i.description || '(无描述)'}\n  内容: ${preview}`
    }).join('\n\n')

    const outputHints = outputContexts.map(o =>
      `- **${o.property}** (${o.title}): ${o.description || '(无描述)'} (类型: ${o.type || 'any'})`
    ).join('\n')

    return `
【输入数据】
${inputList || '(无)'}

【输出端口要求】
${outputHints || '(无)'}

请开始分发...`
  }

  private preview(value: unknown, maxLength: number = 200): string {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') {
      return value.length <= maxLength ? value : value.slice(0, maxLength) + '...'
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value)
      return str.length <= maxLength ? str : str.slice(0, maxLength) + '...'
    }
    return String(value)
  }

  private async executeDispatchLoop(
    ast: SmartAstV1,
    model: any,
    messages: MessageContent[],
    tools: StructuredToolInterface[],
    signal: AbortSignal,
    obs: any
  ): Promise<NodeEvent[]> {
    const events: NodeEvent[] = []

    return new Promise((resolve, reject) => {
      const subscription = this.streamingLlmInvoker.streamWithTools(
        model,
        messages as any,
        signal,
        true,
        tools
      ).pipe(
        tap((chunk: StreamChunk) => {
          if (chunk.type === 'delta' && chunk.delta) {
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { stdout: chunk.delta }
            })
          }

          if (chunk.type === 'complete') {
            ast.dispatchComplete = true
            events.push({ type: 'node_emit', id: ast.id, data: { dispatchComplete: true } })
            console.log(`[SmartAstV1] 分发完成`)
          }
        }),
        catchError((error) => {
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
}
