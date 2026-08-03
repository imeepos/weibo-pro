import { Inject, Injectable, createLogger } from '@sker/core'
import { Handler, NodeEvent, setAstError, WorkflowGraphAst, getEdgesByNode } from '@sker/workflow'
import { SmartAstV1 } from '@sker/workflow-ast'
import { Observable, from, of } from 'rxjs'
import { concatMap, mergeMap, catchError, finalize, tap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { StreamingLlmInvoker, StreamChunk } from './services/StreamingLlmInvoker'
import { SmartToolsFactory } from './services/SmartToolsFactory'
import { StructuredToolInterface } from '@langchain/core/tools'
import {
  MessageContent,
  InputContext,
  OutputContext,
  buildSystemPrompt,
  buildUserPrompt,
} from './services/smart-ast-prompt.util'

const logger = createLogger('SmartAstV1Visitor');

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

          // 记录输入和输出上下文
          logger.info('[SmartAstV1] 输入上下文:', {
            inputDataKeys: inputData ? Object.keys(inputData) : [],
            inputData: inputData,
            inputContexts: inputContexts.map(c => ({ property: c.property, title: c.title, content: c.content }))
          })
          logger.info('[SmartAstV1] 输出上下文:', {
            outputContexts: outputContexts.map(c => ({ property: c.property, title: c.title, type: c.type }))
          })

          this.smartToolsFactory.setDispatchCallback((outputPort: string | null, data: unknown) => {
            // 批量模式：outputPort 为 null，data 是 { port1: data1, port2: data2 } 的映射
            if (outputPort === null && typeof data === 'object' && data !== null) {
              obs.next({
                type: 'node_emit',
                id: ast.id,
                data: data as Record<string, unknown>
              })
              const ports = Object.keys(data)
              logger.info(`[SmartAstV1] 批量分发到 ${ports.length} 个端口:`, ports.join(', '))
              logger.info(`[SmartAstV1] 批量分发数据:`, JSON.stringify(data).slice(0, 500))
            } else if (outputPort) {
              // 单端口模式
              obs.next({
                type: 'node_emit',
                id: ast.id,
                data: { [outputPort]: data }
              })
              logger.info(`[SmartAstV1] 分发到 ${outputPort}:`, typeof data === 'object' ? JSON.stringify(data).slice(0, 100) : data)
            }
          })

          try {
            const tools = this.smartToolsFactory.createTools(outputContexts)

            const model = useLlmModel({
              model: ast.model,
              temperature: ast.temperature
            }).bindTools(tools)

            const messages: MessageContent[] = [
              { role: 'system', content: buildSystemPrompt(ast, inputContexts, outputContexts) },
              { role: 'user', content: buildUserPrompt(inputContexts, outputContexts) }
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
          logger.error('[SmartAstV1] 执行失败:', error)
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
      const inputMeta = ast.metadata?.inputs?.find((i: any) => i.property === edge.toProperty)
      if (!inputMeta) continue

      contexts.push({
        property: edge.toProperty!,
        title: inputMeta.title || edge.toProperty!,
        description: inputMeta.description || '',
        content: inputData[edge.toProperty!]
      })
    }

    return contexts
  }

  private buildOutputContexts(ast: SmartAstV1, ctx: WorkflowGraphAst): OutputContext[] {
    const contexts: OutputContext[] = []
    const outEdges = getEdgesByNode(ctx.edges || [], ast.id, 'out')

    for (const edge of outEdges) {
      const outputMeta = ast.metadata?.outputs?.find((o: any) => o.property === edge.fromProperty)
      if (!outputMeta || outputMeta.property === 'dispatchComplete') continue

      contexts.push({
        property: edge.fromProperty!,
        title: outputMeta.title || edge.fromProperty!,
        description: outputMeta.description || '',
        type: outputMeta.type,
        defaultValue: outputMeta.defaultValue
      })
    }

    return contexts
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
      const _subscription = this.streamingLlmInvoker.streamWithTools(
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
            logger.info(`[SmartAstV1] 分发完成`)
          }
        }),
        catchError((error) => {
          logger.error('[SmartAstV1] 执行失败:', error)
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
