import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { AnswerFinalizerAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class AnswerFinalizerAstVisitor {
  @Handler(AnswerFinalizerAst)
  handler(ast: AnswerFinalizerAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}
