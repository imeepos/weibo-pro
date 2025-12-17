import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { AnswerEvaluatorAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class AnswerEvaluatorAstVisitor {
  @Handler(AnswerEvaluatorAst)
  handler(ast: AnswerEvaluatorAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      obs.next({ type: 'node_runing', id: ast.id })
      $input.pipe(concatMap(input => executeRemote(ast, ctx, input))).subscribe({
        next: (event) => obs.next(event),
        complete: () => {
          obs.next({ type: 'node_success', id: ast.id })
        },
        error: (error) => {
          obs.next({ type: 'node_fail', id: ast.id, error: error.message })
        }
      })
    })
  }
}
