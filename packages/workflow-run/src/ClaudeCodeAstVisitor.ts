import { Injectable, logger } from '@sker/core'
import { Handler, NodeEvent } from '@sker/workflow'
import { ClaudeCodeAst, ClaudeStreamEvent } from '@sker/workflow-ast'
import { ProcessSubject } from './core/ProcessSubject.js'
import { Observable, Subject } from 'rxjs'
import { mergeMap, takeUntil } from 'rxjs/operators'

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
      const stop$ = new Subject<void>()

      const sub = processSubject.pipe(
        takeUntil(stop$)
      ).subscribe({
        next: (data: unknown) => {
          const streamEvent = data as ClaudeStreamEvent
          if (streamEvent.type === 'result') {
            ast.duration = Date.now() - startTime
            ast.result = streamEvent.result!
            obs.next({ type: 'node_emit', id: ast.id, data: { result: streamEvent.result, duration: ast.duration } })
            stop$.next()
            stop$.complete()
            processSubject.complete()
            obs.complete()
            return
          }

          // 非 result 类型，实时发送 node_emit（stdout 端口）
          const content = streamEvent?.message?.content
          let message = ''
          if (Array.isArray(content)) {
            message = content[0]?.text || ''
          } else if (typeof content === 'string') {
            message = content
          } else {
            message = JSON.stringify(streamEvent, null, 2)
          }
          ast.stdout = message
          logger.info(`[executeProcess] ${streamEvent.type} ${message}`)
          obs.next({ type: 'node_emit', id: ast.id, data: { stdout: message } })
        },
        error: (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : String(error)
          ast.stderr = errorMsg
          obs.next({ type: 'node_emit', id: ast.id, data: { stderr: errorMsg } })
        },
        complete: () => {
          ast.duration = Date.now() - startTime
          obs.next({ type: 'node_emit', id: ast.id, data: { duration: ast.duration } })
          obs.complete()
        }
      })

      if (ast.stdin) {
        processSubject.next(Array.isArray(ast.stdin) ? ast.stdin.join('\n') : ast.stdin)
      } else {
        processSubject.complete()
      }

      return () => {
        stop$.next()
        stop$.complete()
        sub.unsubscribe()
        processSubject.complete()
      }
    })
  }
}
