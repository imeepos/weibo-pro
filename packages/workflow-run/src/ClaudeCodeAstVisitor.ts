import { Injectable } from '@sker/core'
import { Handler, NodeEvent } from '@sker/workflow'
import { ClaudeCodeAst, ClaudeStreamEvent } from '@sker/workflow-ast'
import { ProcessSubject } from './core/ProcessSubject.js'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

@Injectable()
export class ClaudeCodeAstVisitor {
  @Handler(ClaudeCodeAst)
  handler(
    ast: ClaudeCodeAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController()

      interface WrappedContext extends Record<string, unknown> {
        abortSignal: AbortSignal
      }

      const wrappedCtx: WrappedContext = {
        ...ctx,
        abortSignal: abortController.signal
      }

      ast.state = 'running'
      obs.next({ type: 'node_runing', id: ast.id })

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              ; (ast as unknown as Record<string, unknown>)[key] = inputData[key]
            })
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消')
          }

          if (!ast.command) {
            throw new Error('命令不能为空')
          }

          const startTime = Date.now()
          const events = await this.executeProcess(ast, startTime)
          return events
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[ClaudeCodeAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[ClaudeCodeAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          obs.next({ type: 'node_fail', id: ast.id, error: error?.message })
        },
        complete: () => {
          ast.state = 'success'
          obs.next({ type: 'node_success', id: ast.id })
          obs.complete()
        }
      })

      return () => {
        subscription.unsubscribe()
        abortController.abort()
        obs.complete()
      }
    })
  }

  private executeProcess(
    ast: ClaudeCodeAst,
    startTime: number
  ): Promise<NodeEvent[]> {
    return new Promise((resolve) => {
      const events: NodeEvent[] = []
      const processSubject = new ProcessSubject(ast.command, ast.args || [])
      ast.pid = processSubject.child.pid ?? 0

      processSubject.subscribe({
        next: (data: unknown) => {
          const streamEvent = data as ClaudeStreamEvent

          // 非 result 类型时，发射 node_progress
          if (streamEvent.type !== 'result') {
            const content = streamEvent?.message?.content
            if (Array.isArray(content)) {
              const msg = content[0]!
              events.push({ type: 'node_progress', id: ast.id, data: { message: msg.text } })
            } else {
              events.push({ type: 'node_progress', id: ast.id, data: { message: content } })
            }
            return
          }

          // result 类型时，发射 node_emit
          ast.result = streamEvent.result!;
          events.push({ type: 'node_emit', id: ast.id, data: { result: streamEvent.result } })
        },
        error: (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : String(error)
          ast.stderr = errorMsg
          events.push({ type: 'node_emit', id: ast.id, data: { stderr: errorMsg } })
        },
        complete: () => {
          ast.duration = Date.now() - startTime
          resolve(events)
        }
      })

      if (ast.stdin) {
        processSubject.next(ast.stdin)
      } else {
        processSubject.complete()
      }
    })
  }
}
