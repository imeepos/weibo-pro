import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { AnswerEvaluatorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class AnswerEvaluatorAstVisitor {
  @Handler(AnswerEvaluatorAst)
  handler(ast: AnswerEvaluatorAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
