import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { AnswerFinalizerAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class AnswerFinalizerAstVisitor {
  @Handler(AnswerFinalizerAst)
  handler(ast: AnswerFinalizerAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
