import { Injectable } from '@sker/core';
import { Ast } from './ast';
import { Input, Node, Output, Handler } from './decorator';
import { NodeEvent } from './execution/events';
import { concatMap, from, mergeMap, Observable } from 'rxjs';

@Node({
  title: '布尔转换',
  type: 'basic',
  errorStrategy: 'skip'
})
export class BooleanAst extends Ast {
  @Input({ title: '输入值', defaultValue: null })
  value: unknown = null;

  @Output({ title: '布尔值', defaultValue: false })
  result!: boolean;

  type = 'BooleanAst';
}

@Injectable()
export class BooleanAstVisitor {
  @Handler(BooleanAst)
  visit(ast: BooleanAst, input$: Observable<any>, _ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      ast.state = 'running'
      obs.next({ type: 'node_runing', id: ast.id })

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          if (inputData?.value !== undefined) {
            ast.value = inputData.value
          }

          const result = this.toBoolean(ast.value)
          ast.result = result
          ast.emitCount += 1

          return [{ type: 'node_emit' as const, id: ast.id, data: { result: ast.result, emitCount: ast.emitCount } }]
        }),
        mergeMap((events) => from(events))
      ).subscribe({
        next: (event) => obs.next(event),
        error: (error) => {
          ast.state = 'fail'
          obs.next({ type: 'node_fail', id: ast.id, error: error.message })
        },
        complete: () => {
          ast.state = 'success'
          obs.next({ type: 'node_success', id: ast.id })
          obs.complete()
        }
      })

      return () => {
        subscription.unsubscribe()
        obs.complete()
      }
    })
  }

  private toBoolean(value: unknown): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return false
  }
}
