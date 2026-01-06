import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { LastAst } from '@sker/workflow-ast';
import { Observable, takeLast } from 'rxjs';

@Injectable()
export class LastAstVisitor {
  @Handler(LastAst)
  handler(ast: LastAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      input$.pipe(takeLast(1)).subscribe({
        next: (inputData) => {
          ast.last = inputData?.['input'] ?? inputData;
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { last: ast.last, emitCount: ast.emitCount } });
        },
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
    });
  }
}
