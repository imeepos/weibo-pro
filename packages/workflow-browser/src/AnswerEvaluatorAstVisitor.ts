import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, setAstError } from '@sker/workflow';
import { AnswerEvaluatorAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote, handlerRemote } from './execute-remote.js';

@Injectable()
export class AnswerEvaluatorAstVisitor {
  @Handler(AnswerEvaluatorAst)
  handler(ast: AnswerEvaluatorAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
