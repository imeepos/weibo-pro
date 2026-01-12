import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { ProcessExecuteAst } from '@sker/workflow-ast'
import { ProcessSubject } from './core/ProcessSubject.js'
import { Observable, Subscriber } from 'rxjs'
import { ErrorHandlerOperators } from './utils/error-handler.util.js'
import type { SpawnOptionsWithoutStdio } from 'child_process'

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

      const subscription = input$.subscribe({
        next: (inputData) => {
          ast.emitCount += 1
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
            })
          }

          if (wrappedCtx.abortSignal?.aborted) {
            ast.state = 'fail'
            setAstError(ast, new Error('工作流已取消'))
            obs.next({ type: 'node_fail', id: ast.id, error: '工作流已取消' })
            obs.complete()
            return
          }

          if (!ast.command) {
            ast.state = 'fail'
            setAstError(ast, new Error('命令不能为空'))
            obs.next({ type: 'node_fail', id: ast.id, error: '命令不能为空' })
            obs.complete()
            return
          }

          const startTime = Date.now()

          const env: Record<string, string> = { ...process.env } as Record<string, string>
          if (ast.envVars && Array.isArray(ast.envVars)) {
            ast.envVars.forEach(({ key, value }) => {
              if (key) env[key] = value
            })
          }

          const spawnOptions: SpawnOptionsWithoutStdio = {
            cwd: ast.cwd || process.cwd(),
            env,
            signal: wrappedCtx.abortSignal,
            shell: process.platform === 'win32'
          }

          this.executeProcess(ast, obs, spawnOptions, startTime)
        },
        error: (error) => {
          ast.state = 'fail'
          setAstError(ast, error instanceof Error ? error : new Error(String(error)))
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
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
    obs: Subscriber<NodeEvent>,
    spawnOptions: SpawnOptionsWithoutStdio,
    startTime: number
  ): void {
    const processSubject = new ProcessSubject(ast.command, ast.args || [], spawnOptions)
    ast.pid = processSubject.child.pid ?? 0

    obs.next({ type: 'node_emit', id: ast.id, data: { pid: ast.pid } })

    processSubject.subscribe({
      next: (data: unknown) => {
        obs.next({ type: 'node_emit', id: ast.id, data: { stdout: data } })
      },
      error: (error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error)
        obs.next({ type: 'node_emit', id: ast.id, data: { stderr: errorMsg } })
      },
      complete: () => {
        ast.duration = Date.now() - startTime
        obs.next({
          type: 'node_emit',
          id: ast.id,
          data: { pid: ast.pid, duration: ast.duration }
        })
      }
    })

    if (ast.stdin) {
      processSubject.next(ast.stdin)
    } else {
      processSubject.complete()
    }
  }
}
