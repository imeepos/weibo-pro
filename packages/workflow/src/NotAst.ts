import { Injectable } from '@sker/core';
import { Ast } from './ast';
import { Input, Node, Output, Handler } from './decorator';
import { NodeEvent } from './execution/events';
import { setAstError } from './ast-utils';
import { Observable } from 'rxjs';

@Node({ title: '布尔取反', type: 'basic', errorStrategy: 'fail' })
export class NotAst extends Ast {
  @Input({ title: '输入', defaultValue: false })
  input: boolean = false;

  @Output({ title: '输出', defaultValue: false })
  output: boolean = false;

  type: 'NotAst' = 'NotAst';
}

@Injectable()
export class NotAstVisitor {
  @Handler(NotAst)
  handler(ast: NotAst, input$: Observable<NotAst>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.subscribe({
        next: (inputData) => {
          ast.emitCount += 1;
          ast.output = !inputData.input;
          obs.next({ type: 'node_emit', id: ast.id, data: { output: ast.output, emitCount: ast.emitCount } });
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
