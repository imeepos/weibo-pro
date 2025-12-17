import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PassThroughAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

/**
 * 透传节点执行器 - 接收输入立即原样输出
 */
@Injectable()
export class PassThroughAstVisitor {
  @Handler(PassThroughAst)
  visit(ast: PassThroughAst, input$: Observable<any>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          ast.output = ast.input;

          return [
            { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
            { type: 'node_emit' as const, id: ast.id, data: { output: ast.output } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
