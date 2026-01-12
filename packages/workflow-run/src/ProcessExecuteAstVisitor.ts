import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { ProcessExecuteAst } from '@sker/workflow-ast'
import { ProcessSubject } from './core/ProcessSubject.js'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

@Injectable()
export class ProcessExecuteAstVisitor {
  @Handler(ProcessExecuteAst)
  handler(
    ast: ProcessExecuteAst,
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
              ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
            })
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消')
          }

          if (!ast.command) {
            throw new Error('命令不能为空')
          }

          const startTime = Date.now()
          console.log(`[ProcessExecuteAstVisitor] 准备启动进程:`, { command: ast.command, args: ast.args })

          const events = await this.executeProcess(ast, startTime)
          return events
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[ProcessExecuteAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[ProcessExecuteAstVisitor]' }),
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
    ast: ProcessExecuteAst,
    startTime: number
  ): Promise<NodeEvent[]> {
    return new Promise((resolve) => {
      const events: NodeEvent[] = []
      console.log(`[ProcessExecuteAstVisitor] 创建 ProcessSubject`)
      const processSubject = new ProcessSubject(ast.command, ast.args || [])
      ast.pid = processSubject.child.pid ?? 0
      console.log(`[ProcessExecuteAstVisitor] 进程已启动, PID: ${ast.pid}`)

      events.push({ type: 'node_emit', id: ast.id, data: { pid: ast.pid } })

      processSubject.subscribe({
        next: (data: unknown) => {
          console.log(`[ProcessExecuteAstVisitor] 收到进程输出:`, data)
          events.push({ type: 'node_emit', id: ast.id, data: { stdout: data } })
        },
        error: (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.log(`[ProcessExecuteAstVisitor] 收到进程错误 (stderr):`, errorMsg)
          events.push({ type: 'node_emit', id: ast.id, data: { stderr: errorMsg } })
        },
        complete: () => {
          ast.duration = Date.now() - startTime
          console.log(`[ProcessExecuteAstVisitor] 进程完成, 耗时: ${ast.duration}ms`)
          events.push({
            type: 'node_emit',
            id: ast.id,
            data: { pid: ast.pid, duration: ast.duration }
          })
          resolve(events)
        }
      })

      if (ast.stdin) {
        console.log(`[ProcessExecuteAstVisitor] 写入 stdin:`, ast.stdin)
        processSubject.next(ast.stdin)
      } else {
        console.log(`[ProcessExecuteAstVisitor] 无 stdin，关闭进程输入`)
        processSubject.complete()
      }
    })
  }
}
