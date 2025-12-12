import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { AnswerEvaluatorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class AnswerEvaluatorAstVisitor {
  @Handler(AnswerEvaluatorAst)
  handler(ast: AnswerEvaluatorAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
