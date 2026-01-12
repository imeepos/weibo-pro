import { Injectable } from '@sker/core'
import { Handler, NodeEvent } from '@sker/workflow'
import { ClaudeCodeAst, ClaudeStreamEvent } from '@sker/workflow-ast'
import { ProcessSubject } from './core/ProcessSubject.js'
import { Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

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
        mergeMap((inputData) => {
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
          return this.executeProcess(ast, startTime)
        })
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
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const processSubject = new ProcessSubject(ast.command, ast.args || [])
      ast.pid = processSubject.child.pid ?? 0

      const sub = processSubject.subscribe({
        next: (data: unknown) => {
          const streamEvent = data as ClaudeStreamEvent

          // 非 result 类型时，实时发送 node_emit
          if (streamEvent.type !== 'result') {
            const content = streamEvent?.message?.content
            if (Array.isArray(content)) {
              const msg = content[0]!
              obs.next({ type: 'node_emit', id: ast.id, data: { message: msg.text } })
            } else if (typeof content === 'string') {
              obs.next({ type: 'node_emit', id: ast.id, data: { message: content } })
            } else {
              obs.next({ type: 'node_emit', id: ast.id, data: { message: streamEvent.type } })
            }
            return
          }

          // result 类型时，发送最终结果
          ast.result = streamEvent.result!
          obs.next({ type: 'node_emit', id: ast.id, data: { result: streamEvent.result } })
        },
        error: (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : String(error)
          ast.stderr = errorMsg
          obs.next({ type: 'node_emit', id: ast.id, data: { stderr: errorMsg } })
        },
        complete: () => {
          ast.duration = Date.now() - startTime
          obs.complete()
        }
      })

      if (ast.stdin) {
        processSubject.next(ast.stdin)
      } else {
        processSubject.complete()
      }

      return () => {
        sub.unsubscribe()
      }
    })
  }
}
